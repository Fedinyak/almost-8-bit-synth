import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';
import { noteToFrequency } from './synthMath';
import {
  ZERO_AUDIO_AMPLITUDE,
  DEFAULT_PLAYBACK_DURATION_SEC,
  createInitialSynthState,
  isValidVolumeNumber,
  isValidDetuneNumber,
  isValidFilterQ,
  extractNativeAudioContext,
  routeAudioNodes,
  applySynthPropertyCompatibility,
  isSynthReadyForPlayback,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  executeHardwareDisconnect,
  executeFilterDisconnect,
  canDisconnectFromHardware,
  isAudioEngineContextMissing,
  shouldUpdateActiveAudioHardware,
  getOscillatorType,
  updateHardwareVolume,
  applyOscillatorParameters,
  applyEnvelopeAutomations,
} from './synthHardware';

// --- ФАБРИКА СТРУКТУРЫ ДАННЫХ МОНОФОНИЧЕСКОГО СИНТЕЗАТОРА ---

const createNativeMonoSynthAdapter = (presetConfig) => {
  // ОТЛАДОЧНЫЙ ЛОГ №1: Фиксируем момент полного пересоздания объекта синта
  console.warn(
    `[🛠️ СИНТ СОЗДАН ЗАНОВО]: Фабрика сработала. Громкость пресета = ${presetConfig?.volume}`,
  );

  const state = createInitialSynthState(presetConfig);

  const adapter = {
    presetConfig,
    oscillatorType: getOscillatorType(presetConfig),
    portamento: 0,
    filterEnvelope: { octaves: 0 },

    getVolume() {
      return state.volumeValue;
    },
    setVolume(val) {
      if (!isValidVolumeNumber(val)) return;
      state.volumeValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        updateHardwareVolume(state, val);
      }
    },

    getDetune() {
      return state.detuneValue;
    },
    setDetune(val) {
      if (!isValidDetuneNumber(val)) return;
      state.detuneValue = val;
    },

    getFilterQ() {
      return state.filterQValue;
    },
    setFilterQ(val) {
      if (!isValidFilterQ(val)) return;
      state.filterQValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        state.nativeBiquad.Q.setValueAtTime(val, state.ctx.currentTime);
      }
    },

    connect(toneNode) {
      if (!toneNode) return adapter;

      // =========================================================================
      // ДИАГНОСТИЧЕСКАЯ ЛОВУШКА ДЛЯ ПРОВЕРКИ МИКРО-ПЕРЕКОММУТАЦИИ ГРАФА
      // Выводим предупреждение и стек вызовов при каждом обращении к методу .connect()
      // Это покажет, дергает ли система кабели синта при кручении ручек барабана.
      // =========================================================================
      console.warn(
        `[🔌 АУДИОКАБЕЛЬ СИНТА ПЕРЕПОДКЛЮЧЕН]: Метод .connect() вызван рантаймом. Нативная инициализация = ${state.isInitialized}`,
      );
      console.trace();

      // ОТЛАДОЧНЫЙ ЛОГ №2: Смотрим, вызывается ли метод пайки и в каком статусе стейт
      console.log(
        `[🔌 МЕТОД .connect()]: Вызван. Нативная инициализация = ${state.isInitialized}`,
      );

      if (isAudioEngineContextMissing(state)) {
        state.ctx = extractNativeAudioContext(toneNode);

        state.outputNode = state.ctx.createGain();
        state.outputNode.gain.value = ZERO_AUDIO_AMPLITUDE;

        state.nativeBiquad = state.ctx.createBiquadFilter();
        state.nativeBiquad.type = 'lowpass';
        state.nativeBiquad.frequency.value = state.filterCutoffValue;
        state.nativeBiquad.Q.value = state.filterQValue;

        state.nativeBiquad.connect(state.outputNode);
        state.isInitialized = true;
        console.log('   └─> [🎯 ВНУТРЕННЯЯ НАТИВНАЯ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА]');
      }

      // --- НА ТИВНАЯ ЗАЧИСТКА TONE.JS (ШАГ 3: ПРЯМОЙ КОННЕКТ НА ДИНАМИКИ СИНТА) ---
      // routeAudioNodes(state.outputNode, toneNode);

      if (state.outputNode && state.ctx) {
        state.outputNode.connect(state.ctx.destination);
      }

      state.isConnectedToHardware = true;
      return adapter;
    },

    disconnect() {
      if (canDisconnectFromHardware(state)) {
        executeHardwareDisconnect(state, state);
      }
      return adapter;
    },

    triggerAttackRelease(note, duration, time) {
      const {
        isInitialized,
        ctx,
        nativeBiquad,
        outputNode,
        detuneValue,
        volumeValue,
      } = state;

      if (!isSynthReadyForPlayback(isInitialized, ctx)) return;
      ensureAudioContextIsActive(ctx);

      const ctxTime = calculateTimelineTimes(ctx, time);
      const parsedDuration =
        typeof duration === 'number' && duration > 0
          ? duration
          : DEFAULT_PLAYBACK_DURATION_SEC;

      const osc = ctx.createOscillator();
      applyOscillatorParameters(
        osc,
        adapter.oscillatorType,
        noteToFrequency(note),
        detuneValue,
        nativeBiquad,
      );

      applyEnvelopeAutomations(
        outputNode.gain,
        ctxTime,
        parsedDuration,
        volumeValue,
        state,
      );

      const releaseStartTime = ctxTime + parsedDuration;
      osc.start(ctxTime);
      osc.stop(releaseStartTime + state.releaseTime);
    },

    dispose() {
      console.warn(
        '[🗑️ DISPOSE СИНТА]: Вызван метод очистки ресурсов из памяти!',
      );
      adapter.disconnect();
      executeFilterDisconnect(state);
    },
  };

  applySynthPropertyCompatibility(adapter, state);
  return adapter;
};

// --- ПУБЛИЧНЫЙ СТАРТОВЫЙ МЕТОД ---

const createSynth = (synthName) => {
  const presetConfig = SYNTH_PRESETS[synthName] || {};

  console.warn(
    `[🚨 ДЕТЕКТОР КРАША]: Метод createSynth ФИЗИЧЕСКИ ВЫЗВАН для инструмента: "${synthName}"! Пресет громкости: ${presetConfig?.volume}`,
  );
  console.trace();

  const rawSynth = createNativeMonoSynthAdapter(presetConfig);

  return wrapInstrumentWithEffects(
    rawSynth,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

export default createSynth;
