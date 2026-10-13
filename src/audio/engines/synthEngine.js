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

      // ИСПРАВЛЕНО: Передаем динамический state пятым аргументом в автоматизацию
      applyEnvelopeAutomations(
        outputNode.gain,
        ctxTime,
        parsedDuration,
        volumeValue,
        state,
      );

      const releaseStartTime = ctxTime + parsedDuration;
      osc.start(ctxTime);
      // ИСПРАВЛЕНО: Время остановки теперь учитывает динамический релиз из стейта вместо константы
      osc.stop(releaseStartTime + state.releaseTime);
    },

    dispose() {
      adapter.disconnect();
      executeFilterDisconnect(state);
    },
  };

  // ИСПРАВЛЕНО: Передаем state вторым аргументом для маппинга динамических геттеров/сеттеров ADSR и фильтра
  applySynthPropertyCompatibility(adapter, state);
  return adapter;
};

// --- ПУБЛИЧНЫЙ СТАРТОВЫЙ МЕТОД ---

const createSynth = (synthName) => {
  const presetConfig = SYNTH_PRESETS[synthName] || {};
  const rawSynth = createNativeMonoSynthAdapter(presetConfig);

  return wrapInstrumentWithEffects(
    rawSynth,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

export default createSynth;
