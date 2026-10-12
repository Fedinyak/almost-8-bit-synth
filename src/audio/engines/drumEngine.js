import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';
import { synthesisMembraneDrum, synthesisNoiseDrum } from './drumSynthesis';
import {
  ZERO_AUDIO_AMPLITUDE,
  dbToLinearGain,
  isValidVolumeNumber,
  isNodeMissing,
  createInitialDrumState,
  routeAudioNodes,
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

// --- НАСТРОЙКИ ТИПОВ СИНТЕЗА (INSTRUMENT TYPES) ---
const SYNTH_TYPE_MEMBRANE = 'MembraneSynth';

// --- ДЕФОЛТНЫЕ НАСТРОЙКИ ОГИБАЮЩЕЙ (ENVELOPE FALLBACKS) ---
const DEFAULT_ENVELOPE_ATTACK_SEC = 0.005;
const DEFAULT_ENVELOPE_DECAY_SEC = 0.1;
const DEFAULT_ENVELOPE_RELEASE_SEC = 0.3;

// --- ЛОКАЛЬНЫЕ ВСПОМОГАТЕЛЬНЫЕ ПРЕДИКАТЫ ---

const hasDisposeMethod = (container) =>
  container && typeof container.dispose === 'function';

const safelyDisposeContainer = (container) => {
  if (hasDisposeMethod(container)) {
    container.dispose();
  }
};

// --- ВЫНЕСЕННЫЕ ФУНКЦИИ УПРАВЛЕНИЯ НА ТЕКУЩЕМ ШАГЕ ---

// Сохранение ссылки на текущий гейн-параметр для плавного гашения щелчков на следующем шаге
const captureLastGainParam = (state, drumGain) => {
  state.lastGainParam = drumGain.gain;
};

// Низкоуровневое отключение аудио-узлов от системного микшера с деструктуризацией аргументов
const executeHardwareDisconnect = (state, { outputNode }) => {
  try {
    outputNode.disconnect();
    state.isConnectedToHardware = false;
  } catch (e) {}
};

// Обновление физической громкости на аудио-ноде барабана
const updateHardwareDrumVolume = ({ outputNode, ctx }, decibelsValue) => {
  outputNode.gain.setValueAtTime(
    dbToLinearGain(decibelsValue),
    ctx.currentTime,
  );
};

// --- ФАБРИКА СТРУКТУРЫ ДАННЫХ БАРАБАНА ---

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

    connect(toneNode) {
      if (isNodeMissing(toneNode)) return adapter;

      if (isAudioEngineContextMissing(state)) {
        state.ctx = extractNativeAudioContext(toneNode);
        state.outputNode = state.ctx.createGain();
        state.outputNode.gain.value = dbToLinearGain(state.volumeValue);
        state.isInitialized = true;
      }

      routeAudioNodes(state.outputNode, toneNode);
      state.isConnectedToHardware = true;
      return adapter;
    },

    disconnect() {
      if (canDisconnectFromHardware(state)) {
        executeHardwareDisconnect(state, state);
      }
      return adapter;
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

      captureLastGainParam(state, drumGain);

      applyGainEnvelope(
        drumGain.gain,
        ctxTime,
        attack,
        totalDrumDuration,
        dbToLinearGain(state.volumeValue),
      );

      const isMembrane = typeString === SYNTH_TYPE_MEMBRANE;
      if (isMembrane) {
        synthesisMembraneDrum(ctx, drumGain, ctxTime, totalDrumDuration);
        return;
      }

      synthesisNoiseDrum(ctx, drumGain, drumName, ctxTime, totalDrumDuration);
    },

    dispose() {
      adapter.disconnect();
    },
  };

  applyVolumePropertyCompatibility(adapter);
  return adapter;
};

// --- ВЫНЕСЕННЫЕ ДЕКЛАРАТИВНЫЕ СБОРЩИКИ РЭКОВ (КОНВЕЙЕРЫ) ---

const wrapDrumInEffectsRack = (drumName, rawSynth) => {
  const instrumentPreset = DRUM_PRESETS[drumName] || {};
  return wrapInstrumentWithEffects(
    rawSynth,
    instrumentPreset,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

const assembleSingleRackInstrument = (drumName, typeString) => {
  const presetConfig = DRUM_PRESETS[drumName] || {};
  const rawSynth = createNativeDrumAdapter(drumName, typeString, presetConfig);

  return wrapDrumInEffectsRack(drumName, rawSynth);
};

const buildRackFromTypeMap = (typeMap) => {
  const rack = {};

  Object.entries(typeMap).forEach(([drumName, typeString]) => {
    rack[drumName] = assembleSingleRackInstrument(drumName, typeString);
  });

  return rack;
};

const disposeAllRackContainers = (wrappedDrums) => {
  Object.values(wrappedDrums).forEach(safelyDisposeContainer);
};

// --- ПУБЛИЧНЫЙ СТАРТОВЫЙ МЕТОД ---

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
