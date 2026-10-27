import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_CUTOFF,
  WAVEFORM_SQUARE,
} from '../../constants/audioEngineConfig';

export {
  WAVEFORM_SQUARE,
  WAVEFORM_SAWTOOTH,
  WAVEFORM_TRIANGLE,
} from '../../constants/audioEngineConfig';

import {
  extractNativeAudioContext,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  dbToLinearGain,
} from '../../utils/audioMathUtils';

export {
  extractNativeAudioContext,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  dbToLinearGain,
};

// --- СИСТЕМНЫЕ ЗВУКОВЫЕ КОНСТАНТЫ ---
export const ZERO_AUDIO_AMPLITUDE = 0;
export const FILTER_TYPE_LOWPASS = 'lowpass';

export const DEFAULT_LOG_GAIN_DECIBELS = AUDIO_DEFAULT_VOLUME;
export const DEFAULT_FILTER_CUTOFF_HZ = AUDIO_DEFAULT_CUTOFF;
export const DEFAULT_FILTER_Q_VALUE = 1.0;
export const DEFAULT_PLAYBACK_DURATION_SEC = 0.2;

export const DEFAULT_ATTACK_RAMP_TIME_SEC = AUDIO_DEFAULT_ATTACK;
export const DEFAULT_DECAY_RAMP_TIME_SEC = AUDIO_DEFAULT_DECAY;
export const DEFAULT_RELEASE_RAMP_TIME_SEC = AUDIO_DEFAULT_RELEASE;
export const DEFAULT_SUSTAIN_GAIN_MULTIPLIER = AUDIO_DEFAULT_SUSTAIN;

export const DEFAULT_PORTAMENTO_SEC = 0.0;
export const DEFAULT_FILTER_ENV_OCTAVES = 0.0;

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---

export const isNodeMissing = (node) => !node;

export const isNodePresent = (node) => !!node;

export const isValidVolumeNumber = (val) =>
  typeof val === 'number' && !isNaN(val);

export const isValidDetuneNumber = (val) =>
  typeof val === 'number' && !isNaN(val);

export const isValidFilterQ = (val) =>
  typeof val === 'number' && !isNaN(val) && val >= 0;

export const isValidAdsrParam = (val) =>
  typeof val === 'number' && !isNaN(val) && val >= 0;

export const isSynthReadyForPlayback = (isInitialized, ctx) =>
  !!(isInitialized && ctx);

export const shouldUpdateActiveAudioHardware = (state) =>
  !!(state.isInitialized && state.outputNode && state.ctx);

export const isAudioEngineContextMissing = (state) => !state.isInitialized;

export const canDisconnectFromHardware = (state) =>
  !!(state.isConnectedToHardware && state.outputNode);

export const isReleaseMethod = (methodName) => methodName === 'setRelease';
export const isGetterMethod = (methodName) => methodName.startsWith('get');
export const isCutoffParamValid = (val) =>
  typeof val === 'number' && !isNaN(val);
export const isNumberValue = (val) => typeof val === 'number';
export const isStrategyOscillator = (strategyType) =>
  strategyType === 'oscillator';
export const isStrategyNested = (strategyType) => strategyType === 'nested';
export const isToneNodeConnectable = (toneNode) =>
  toneNode && typeof toneNode.connect === 'function';

// --- ВЫЧИСЛИТЕЛЬНЫЕ ОПЕРАЦИИ DSP ---

export const getOscillatorType = (presetConfig) => {
  return presetConfig.oscillatorType || WAVEFORM_SQUARE;
};

// --- КОММУТАЦИЯ НИЗКОУРОВНЕВОГО ГРАФА И АВТОМАТИЗАЦИЯ ---

export const updateHardwareVolume = ({ outputNode, ctx }, decibelsValue) => {
  outputNode.gain.setValueAtTime(
    dbToLinearGain(decibelsValue),
    ctx.currentTime,
  );
};

export const applyOscillatorParameters = (
  osc,
  oscillatorType,
  frequencyHz,
  detuneValue,
  targetInputNode,
) => {
  osc.type = oscillatorType;
  osc.frequency.setValueAtTime(frequencyHz, osc.context.currentTime);
  osc.detune.setValueAtTime(detuneValue, osc.context.currentTime);
  osc.connect(targetInputNode);
};
