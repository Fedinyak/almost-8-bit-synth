import {
  dbToLinearGain,
  extractNativeAudioContext,
  ensureAudioContextIsActive,
} from '../../utils/audioMathUtils';
import {
  DRUM_ABSOLUTE_MIN_RAMP_TIME_SEC,
  DRUM_DEBUG_DESTINATION_GAIN,
  AUDIO_DEFAULT_VOLUME,
} from '../../constants/audioEngineConfig';

export const ZERO_AUDIO_AMPLITUDE = 0;

export {
  dbToLinearGain,
  extractNativeAudioContext,
  ensureAudioContextIsActive,
};

export const isValidVolumeNumber = (val) =>
  typeof val === 'number' && !isNaN(val);

export const isNodeMissing = (node) => !node;

export const createInitialDrumState = (presetConfig) => ({
  volumeValue:
    typeof presetConfig.volume === 'number'
      ? presetConfig.volume
      : AUDIO_DEFAULT_VOLUME,
  lastGainParam: null,
  isInitialized: false,
  isConnectedToHardware: false,
  ctx: null,
  outputNode: null,
});

export const safelyCancelGainRamp = (lastGainParam, ctxTime) => {
  if (isNodeMissing(lastGainParam)) return;
  try {
    lastGainParam.cancelScheduledValues(ctxTime);
    lastGainParam.setValueAtTime(lastGainParam.value, ctxTime);
    lastGainParam.linearRampToValueAtTime(
      ZERO_AUDIO_AMPLITUDE,
      ctxTime + DRUM_ABSOLUTE_MIN_RAMP_TIME_SEC,
    );
  } catch (err) {}
};

export const routeAudioNodes = (outputNode, toneNode) => {
  const target = toneNode.input || toneNode;
  const nativeDestination =
    target._gainNode || target._node || target.input || target;

  try {
    outputNode.connect(nativeDestination);
  } catch (e) {
    if (typeof toneNode.connect === 'function') {
      try {
        outputNode.connect(toneNode);
      } catch (err) {}
    }
  }
};

export const applyVolumePropertyCompatibility = (adapter) => {
  const createVolumeProxyFacade = () => ({
    get value() {
      return adapter.getVolume();
    },
    set value(val) {
      adapter.setVolume(val);
    },
  });

  Object.defineProperty(adapter, 'volume', {
    get: createVolumeProxyFacade,
  });
};

const clampPlaybackTimeToCurrentContext = (now, requestedTime) => {
  const isTimeInFuture =
    typeof requestedTime === 'number' && requestedTime >= now;
  return isTimeInFuture ? requestedTime : now;
};

export const calculateTimelineTimes = (ctx, requestedTime, attack, decay) => {
  const now = ctx.currentTime;
  const ctxTime = clampPlaybackTimeToCurrentContext(now, requestedTime);
  const totalDrumDuration = attack + decay;

  return { ctxTime, totalDrumDuration };
};

const assembleGainSignalChain = (ctx, drumGain, outputNode) => {
  drumGain.connect(outputNode);

  const debugGain = ctx.createGain();
  debugGain.gain.value = DRUM_DEBUG_DESTINATION_GAIN;
  drumGain.connect(debugGain);
  debugGain.connect(ctx.destination);
};

export const createDrumSignalChain = (
  ctx,
  outputNode,
  lastGainParam,
  ctxTime,
) => {
  safelyCancelGainRamp(lastGainParam, ctxTime);

  const drumGain = ctx.createGain();
  assembleGainSignalChain(ctx, drumGain, outputNode);

  return drumGain;
};

export const applyGainEnvelope = (
  gainParam,
  ctxTime,
  attack,
  totalDuration,
  targetGain,
) => {
  gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime);
  gainParam.linearRampToValueAtTime(targetGain, ctxTime + attack);
  gainParam.linearRampToValueAtTime(
    ZERO_AUDIO_AMPLITUDE,
    ctxTime + totalDuration,
  );
};

export const isDrumReadyForPlayback = (isInitialized, ctx) => {
  return !!(isInitialized && ctx);
};

export const shouldUpdateActiveAudioHardware = (state) =>
  !!(state.isInitialized && state.outputNode && state.ctx);
export const isAudioEngineContextMissing = (state) => !state.isInitialized;
export const canDisconnectFromHardware = (state) =>
  !!(state.isConnectedToHardware && state.outputNode);
