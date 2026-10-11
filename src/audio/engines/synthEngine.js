import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';
import { noteToFrequency } from './synthMath';
import {
  ZERO_AUDIO_AMPLITUDE,
  DEFAULT_LOG_GAIN_DECIBELS,
  DEFAULT_FILTER_CUTOFF_HZ,
  DEFAULT_FILTER_Q_VALUE,
  DEFAULT_PLAYBACK_DURATION_SEC,
  ATTACK_RAMP_TIME_SEC,
  DECAY_RAMP_TIME_SEC,
  RELEASE_RAMP_TIME_SEC,
  SUSTAIN_GAIN_MULTIPLIER,
  createInitialSynthState,
  extractNativeAudioContext,
  routeAudioNodes,
  applySynthPropertyCompatibility,
  isSynthReadyForPlayback,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  executeHardwareDisconnect,
  canDisconnectFromHardware,
  isAudioEngineContextMissing,
  shouldUpdateActiveAudioHardware,
  applyOscillatorParameters,
  applyEnvelopeAutomations,
} from './synthHardware';

// --- ФАБРИКА СТРУКТУРЫ ДАННЫХ МОНОФОНИЧЕСКОГО СИНТЕЗАТОРА ---

const createNativeMonoSynthAdapter = (presetConfig) => {
  const state = createInitialSynthState(presetConfig);

  const adapter = {
    presetConfig,
    oscillatorType: presetConfig.oscillatorType || 'square',
    portamento: 0,
    filterEnvelope: { octaves: 0 },

    getVolume() {
      return state.volumeValue;
    },
    setVolume(val) {
      if (typeof val !== 'number' || isNaN(val)) return;
      state.volumeValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        const linearGain = Math.pow(10, val / 20);
        state.outputNode.gain.setValueAtTime(linearGain, state.ctx.currentTime);
      }
    },

    getDetune() {
      return state.detuneValue;
    },
    setDetune(val) {
      if (typeof val === 'number' && !isNaN(val)) {
        state.detuneValue = val;
      }
    },

    getFilterQ() {
      return state.filterQValue;
    },
    setFilterQ(val) {
      const isValidQ = typeof val === 'number' && !isNaN(val) && val >= 0;
      if (!isValidQ) return;

      state.filterQValue = val;
      if (state.nativeBiquad && state.ctx) {
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

      applyEnvelopeAutomations(
        outputNode.gain,
        ctxTime,
        parsedDuration,
        volumeValue,
      );

      const releaseStartTime = ctxTime + parsedDuration;
      osc.start(ctxTime);
      osc.stop(releaseStartTime + RELEASE_RAMP_TIME_SEC);
    },

    dispose() {
      adapter.disconnect();
      if (state.nativeBiquad) {
        try {
          state.nativeBiquad.disconnect();
        } catch (e) {}
      }
    },
  };

  applySynthPropertyCompatibility(adapter);
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
