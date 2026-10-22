import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../core/audioEngineCore';
import {
  dbToLinearGain,
  isValidVolumeNumber,
  isNodeMissing,
  createInitialDrumState,
  applyVolumePropertyCompatibility,
  calculateTimelineTimes,
  createDrumSignalChain,
  applyGainEnvelope,
  ensureAudioContextIsActive,
  isDrumReadyForPlayback,
  extractNativeAudioContext,
  shouldUpdateActiveAudioHardware,
  isAudioEngineContextMissing,
  canDisconnectFromHardware,
} from './drumHardware';
import {
  hasDisposeMethod,
  updateHardwareDrumVolume,
  executeHardwareDisconnect,
  dispatchDrumSynthesis,
} from './drumEngineModel';

// --- ДЕФОЛТНЫЕ НАСТРОЙКИ ОГИБАЮЩЕЙ (ENVELOPE FALLBACKS) ---
const DEFAULT_ENVELOPE_ATTACK_SEC = 0.005;
const DEFAULT_ENVELOPE_DECAY_SEC = 0.1;
const DEFAULT_ENVELOPE_RELEASE_SEC = 0.3;

// --- ФАБРИКА СТРУКТУРЫ ДАННЫХ БАРАБАНА (INTERNAL SYNTH CORE) ---

const createNativeDrumAdapter = (drumName, typeString, presetConfig) => {
  const state = createInitialDrumState(presetConfig);

  const adapter = {
    drumName,
    typeString,
    presetConfig,

    envelope: {
      attack: presetConfig.attack || DEFAULT_ENVELOPE_ATTACK_SEC,
      decay: presetConfig.decay || DEFAULT_ENVELOPE_DECAY_SEC,
      release: presetConfig.release || DEFAULT_ENVELOPE_RELEASE_SEC,
      set(params) {
        Object.assign(adapter.envelope, params);
      },
    },

    getVolume() {
      return state.volumeValue;
    },

    setVolume(val) {
      if (!isValidVolumeNumber(val)) return;
      state.volumeValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        updateHardwareDrumVolume(state, val);
      }
    },

    /**
     * Внутренняя низкоуровневая коммутация: теперь подключается СТРОГО к pannerNode своего рэка
     */
    connectInternal(pannerNode) {
      if (isAudioEngineContextMissing(state)) {
        state.ctx = extractNativeAudioContext(pannerNode);
        state.outputNode = state.ctx.createGain();
        state.outputNode.gain.value = dbToLinearGain(state.volumeValue);
        state.isInitialized = true;
      }

      if (state.outputNode) {
        state.outputNode.connect(pannerNode);
      }

      state.isConnectedToHardware = true;
      return state;
    },

    triggerAttackRelease(noteOrDuration, duration, time) {
      const { isInitialized, ctx, outputNode, lastGainParam } = state;

      if (!isDrumReadyForPlayback(isInitialized, ctx)) return;
      ensureAudioContextIsActive(ctx);

      const { attack, decay } = adapter.envelope;

      const { ctxTime, totalDrumDuration } = calculateTimelineTimes(
        ctx,
        time,
        attack,
        decay,
      );
      const drumGain = createDrumSignalChain(
        ctx,
        outputNode,
        lastGainParam,
        ctxTime,
      );

      state.lastGainParam = drumGain.gain;

      applyGainEnvelope(
        drumGain.gain,
        ctxTime,
        attack,
        totalDrumDuration,
        dbToLinearGain(state.volumeValue),
      );

      dispatchDrumSynthesis(
        typeString,
        ctx,
        drumGain,
        drumName,
        ctxTime,
        totalDrumDuration,
      );
    },
  };

  applyVolumePropertyCompatibility(adapter);
  return { adapter, state };
};

// --- ВЫНЕСЕННЫЕ ДЕКЛАРАТИВНЫЕ СБОРЩИКИ РЭКОВ (HARDWARE ROUTER) ---

const wrapDrumInEffectsRack = (drumName, rawSynth) => {
  const instrumentPreset = DRUM_PRESETS[drumName] || {};
  return wrapInstrumentWithEffects(
    rawSynth,
    instrumentPreset,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

/**
 * Собирает полноценную независимую канальную линейку (Channel Strip) для одного барабана
 */
const assembleSingleRackInstrument = (drumName, typeString) => {
  const presetConfig = DRUM_PRESETS[drumName] || {};

  // 1. Создаем внутренний движок синтеза и его изолированный стейт
  const { adapter, state } = createNativeDrumAdapter(
    drumName,
    typeString,
    presetConfig,
  );

  // 2. Оборачиваем во внешний рэк эффектов
  const rack = wrapDrumInEffectsRack(drumName, adapter);

  // 3. Коммутируем внутренний синтезатор со входом рэка (pannerNode) строго один раз
  adapter.connectInternal(rack.panner);

  // 4. Проксируем методы управления звуком наружу на уровень рэка, создавая чистый инкапсулированный фасад
  rack.drumName = adapter.drumName;
  rack.typeString = adapter.typeString;
  rack.envelope = adapter.envelope;
  rack.getVolume = () => adapter.getVolume();
  rack.setVolume = (val) => adapter.setVolume(val);
  rack.triggerAttackRelease = (note, dur, time) =>
    adapter.triggerAttackRelease(note, dur, time);

  // 5. Переопределяем внешние методы коммутации, чтобы они управляли ФИНАЛЬНЫМ ВЫХОДОМ рэка, а не ядром синта
  rack.connect = (toneNode) => {
    if (isNodeMissing(toneNode)) return rack;
    if (rack.output) {
      rack.output.connect(toneNode);
    }
    return rack;
  };

  rack.disconnect = () => {
    if (canDisconnectFromHardware(state)) {
      executeHardwareDisconnect(state);
    }
    if (rack.output) {
      try {
        rack.output.disconnect();
      } catch (e) {}
    }
    return rack;
  };

  rack.dispose = () => {
    rack.disconnect();
    if (typeof adapter.dispose === 'function') {
      adapter.dispose();
    }
  };

  return rack;
};

const buildRackFromTypeMap = (typeMap) => {
  const rack = {};
  const entries = Object.entries(typeMap);
  const totalEntries = entries.length;

  for (let i = 0; i < totalEntries; i++) {
    const [drumName, typeString] = entries[i];
    rack[drumName] = assembleSingleRackInstrument(drumName, typeString);
  }

  return rack;
};

const disposeAllRackContainers = (wrappedDrums) => {
  const containers = Object.values(wrappedDrums);
  const totalContainers = containers.length;

  for (let i = 0; i < totalContainers; i++) {
    const container = containers[i];
    if (hasDisposeMethod(container)) {
      container.dispose();
    }
  }
};

// --- ГЛАВНЫЙ СЛУЖЕБНЫЙ МЕТОД ФАБРИКИ ---

const createDrums = () => {
  const wrappedDrums = buildRackFromTypeMap(DRUM_TYPE_MAP);

  return {
    ...wrappedDrums,
    dispose() {
      disposeAllRackContainers(wrappedDrums);
    },
  };
};

export default createDrums;
