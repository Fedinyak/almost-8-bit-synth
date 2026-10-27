import { dbToLinearGain, isNodeMissing } from './synthHardware';

export const hasDisposeMethod = (container) =>
  container && typeof container.dispose === 'function';

export const updateHardwareSynthVolume = (
  { outputNode, ctx },
  decibelsValue,
) => {
  if (outputNode && ctx) {
    outputNode.gain.setValueAtTime(
      dbToLinearGain(decibelsValue),
      ctx.currentTime,
    );
  }
};

export const executeHardwareDisconnect = (state) => {
  if (state.outputNode && state.isConnectedToHardware) {
    try {
      state.outputNode.disconnect();
      state.isConnectedToHardware = false;
    } catch (e) {}
  }
};

export const executeFilterDisconnect = ({ nativeBiquad }) => {
  if (isNodeMissing(nativeBiquad)) return;
  try {
    nativeBiquad.disconnect();
  } catch (e) {}
};

export const createInitialSynthState = (presetConfig, defaults) => ({
  volumeValue:
    typeof presetConfig.volume === 'number'
      ? presetConfig.volume
      : defaults.DEFAULT_LOG_GAIN_DECIBELS,
  detuneValue:
    typeof presetConfig.detune === 'number' ? presetConfig.detune : 0,
  filterCutoffValue:
    typeof presetConfig.filterLowpassCutoff === 'number'
      ? presetConfig.filterLowpassCutoff
      : defaults.DEFAULT_FILTER_CUTOFF_HZ,
  filterQValue: defaults.DEFAULT_FILTER_Q_VALUE,

  attackTime:
    typeof presetConfig.attack === 'number'
      ? presetConfig.attack
      : defaults.DEFAULT_ATTACK_RAMP_TIME_SEC,
  decayTime:
    typeof presetConfig.decay === 'number'
      ? presetConfig.decay
      : defaults.DEFAULT_DECAY_RAMP_TIME_SEC,
  sustainLevel:
    typeof presetConfig.sustain === 'number'
      ? presetConfig.sustain
      : defaults.DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
  releaseTime:
    typeof presetConfig.release === 'number'
      ? presetConfig.release
      : defaults.DEFAULT_RELEASE_RAMP_TIME_SEC,

  isInitialized: false,
  isConnectedToHardware: false,
  ctx: null,
  outputNode: null,
  nativeBiquad: null,
});
