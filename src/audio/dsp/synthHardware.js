export const WAVEFORM_SQUARE = 'square';
export const WAVEFORM_SAWTOOTH = 'sawtooth';
export const WAVEFORM_TRIANGLE = 'triangle';

export const ZERO_AUDIO_AMPLITUDE = 0;
export const DEFAULT_LOG_GAIN_DECIBELS = 0;
export const DEFAULT_FILTER_CUTOFF_HZ = 4500;
export const DEFAULT_FILTER_Q_VALUE = 1.0;
export const DEFAULT_PLAYBACK_DURATION_SEC = 0.2;

export const DEFAULT_ATTACK_RAMP_TIME_SEC = 0.005;
export const DEFAULT_DECAY_RAMP_TIME_SEC = 0.1;
export const DEFAULT_RELEASE_RAMP_TIME_SEC = 0.15;
export const DEFAULT_SUSTAIN_GAIN_MULTIPLIER = 0.5;

const DB_CONVERSION_BASE = 10;
const DB_CONVERSION_DIVISER = 20;

export const dbToLinearGain = (dbValue) =>
  Math.pow(DB_CONVERSION_BASE, dbValue / DB_CONVERSION_DIVISER);

export const isValidVolumeNumber = (val) =>
  typeof val === 'number' && !isNaN(val);
export const isValidDetuneNumber = (val) =>
  typeof val === 'number' && !isNaN(val);
export const isValidFilterQ = (val) =>
  typeof val === 'number' && !isNaN(val) && val >= 0;
export const isValidAdsrParam = (val) =>
  typeof val === 'number' && !isNaN(val) && val >= 0;

export const isNodeMissing = (node) => !node;

export const extractNativeAudioContext = (toneNode) => {
  return (
    toneNode.context?.rawContext || toneNode.context || window.audioContext
  );
};

export const isSynthReadyForPlayback = (isInitialized, ctx) => {
  return isInitialized && ctx;
};

export const ensureAudioContextIsActive = (ctx) => {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

export const calculateTimelineTimes = (ctx, requestedTime) => {
  const now = ctx.currentTime;
  return typeof requestedTime === 'number' && requestedTime >= now
    ? requestedTime
    : now;
};

export const shouldUpdateActiveAudioHardware = (state) =>
  state.isInitialized && state.outputNode && state.ctx;
export const isAudioEngineContextMissing = (state) => !state.isInitialized;
export const canDisconnectFromHardware = (state) =>
  state.isConnectedToHardware && state.outputNode;

export const getOscillatorType = (presetConfig) => {
  return presetConfig.oscillatorType || WAVEFORM_SQUARE;
};
