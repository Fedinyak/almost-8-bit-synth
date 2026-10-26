import {
  createInitialDrumState,
  isValidVolumeNumber,
  shouldUpdateActiveAudioHardware,
  isAudioEngineContextMissing,
  extractNativeAudioContext,
  dbToLinearGain,
  isDrumReadyForPlayback,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  createDrumSignalChain,
  applyGainEnvelope,
} from '../dsp/drumHardware';
import {
  updateHardwareDrumVolume,
  dispatchDrumSynthesis,
} from './drumEngineModel';

const DEFAULT_ENVELOPE_ATTACK_SEC = 0.005;
const DEFAULT_ENVELOPE_DECAY_SEC = 0.1;
const DEFAULT_ENVELOPE_RELEASE_SEC = 0.3;

/**
 * Изолированная фабрика низкоуровневого движка синтеза звука барабана
 */
export const createNativeDrumAdapter = (drumName, typeString, presetConfig) => {
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

  return { adapter, state };
};
