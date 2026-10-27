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
  assembleNativeSynthGraph,
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

const hasValidDuration = (duration) =>
  typeof duration === 'number' && duration > 0;

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

        // Декларативно запрашиваем готовую сборку графа
        const nativeGraph = assembleNativeSynthGraph(state, pannerNode);

        state.outputNode = nativeGraph.outputNode;
        state.nativeBiquad = nativeGraph.nativeBiquad;
        state.isInitialized = true;
        console.log('   └─> [ВНУТРЕННЯЯ НАТИВНАЯ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА]');
      }

      state.isConnectedToHardware = true;
      return state;
    },

    triggerAttackRelease(note, duration, time) {
      if (!isSynthReadyForPlayback(state.isInitialized, state.ctx)) return;
      ensureAudioContextIsActive(state.ctx);

      const ctxTime = calculateTimelineTimes(state.ctx, time);
      const parsedDuration = hasValidDuration(duration)
        ? duration
        : DEFAULT_PLAYBACK_DURATION_SEC;

      const osc = state.ctx.createOscillator();
      applyOscillatorParameters(
        osc,
        adapter.oscillatorType,
        noteToFrequency(note),
        state.detuneValue,
        state.nativeBiquad,
      );

      applyEnvelopeAutomations(
        state.outputNode.gain,
        ctxTime,
        parsedDuration,
        state.volumeValue,
        state,
        SYNTH_DEFAULTS,
      );

      const releaseStartTime = ctxTime + parsedDuration;
      osc.start(ctxTime);
      osc.stop(releaseStartTime + state.releaseTime);
    },

    dispose() {
      console.warn('[DISPOSE СИНТА]: Вызван метод очистки ресурсов из памяти!');
      executeFilterDisconnect(state);
    },
  };

  return { adapter, state };
};
