import { noteToFrequency } from './synthMath';
import {
  isValidVolumeNumber,
  isValidDetuneNumber,
  isValidFilterQ,
  extractNativeAudioContext,
  isSynthReadyForPlayback,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  isAudioEngineContextMissing,
  shouldUpdateActiveAudioHardware,
  getOscillatorType,
  dbToLinearGain,
  ZERO_AUDIO_AMPLITUDE,
  DEFAULT_PLAYBACK_DURATION_SEC,
  DEFAULT_LOG_GAIN_DECIBELS,
  DEFAULT_FILTER_CUTOFF_HZ,
  DEFAULT_FILTER_Q_VALUE,
  DEFAULT_ATTACK_RAMP_TIME_SEC,
  DEFAULT_DECAY_RAMP_TIME_SEC,
  DEFAULT_RELEASE_RAMP_TIME_SEC,
  DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
} from './synthHardware';
import {
  createInitialSynthState,
  updateHardwareSynthVolume,
  executeFilterDisconnect,
} from './synthEngineModel';
import {
  applyOscillatorParameters,
  applyEnvelopeAutomations,
} from './synthSynthesis';

const SYNTH_DEFAULTS = {
  DEFAULT_LOG_GAIN_DECIBELS,
  DEFAULT_FILTER_CUTOFF_HZ,
  DEFAULT_FILTER_Q_VALUE,
  DEFAULT_ATTACK_RAMP_TIME_SEC,
  DEFAULT_DECAY_RAMP_TIME_SEC,
  DEFAULT_RELEASE_RAMP_TIME_SEC,
  DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
};

export const createNativeMonoSynthAdapter = (presetConfig) => {
  console.warn(
    `[🛠️ СИНТ СОЗДАН ЗАНОВО]: Фабрика сработала. Громкость пресета = ${presetConfig?.volume}`,
  );

  const state = createInitialSynthState(presetConfig, SYNTH_DEFAULTS);

  const adapter = {
    presetConfig,
    oscillatorType: getOscillatorType(presetConfig),
    portamento: 0,
    filterEnvelope: { octaves: 0 },
    releaseTime: state.releaseTime,

    getVolume() {
      return state.volumeValue;
    },
    setVolume(val) {
      if (!isValidVolumeNumber(val)) return;
      state.volumeValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        updateHardwareSynthVolume(state, val);
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

    connectInternal(pannerNode) {
      if (isAudioEngineContextMissing(state)) {
        state.ctx = extractNativeAudioContext(pannerNode);

        state.outputNode = state.ctx.createGain();
        state.outputNode.gain.value = dbToLinearGain(state.volumeValue);

        state.nativeBiquad = state.ctx.createBiquadFilter();
        state.nativeBiquad.type = 'lowpass';
        state.nativeBiquad.frequency.value = state.filterCutoffValue;
        state.nativeBiquad.Q.value = state.filterQValue;

        state.nativeBiquad.connect(state.outputNode);
        state.isInitialized = true;
        console.log('   └─> [🎯 ВНУТРЕННЯЯ НАТИВНАЯ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА]');
      }

      if (state.outputNode) {
        state.outputNode.connect(pannerNode);
      }

      state.isConnectedToHardware = true;
      return state;
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
        SYNTH_DEFAULTS,
      );

      const releaseStartTime = ctxTime + parsedDuration;
      osc.start(ctxTime);
      osc.stop(releaseStartTime + state.releaseTime);
    },

    dispose() {
      console.warn(
        '[🗑️ DISPOSE СИНТА]: Вызван метод очистки ресурсов из памяти!',
      );
      executeFilterDisconnect(state);
    },
  };

  return { adapter, state };
};
