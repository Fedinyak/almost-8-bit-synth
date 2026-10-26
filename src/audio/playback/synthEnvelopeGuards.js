const METAL_SYNTH_NAME = 'MetalSynth';

const isSettingDefined = (value) => value !== undefined;

export const isMetalSynth = (instrument) =>
  instrument?.name === METAL_SYNTH_NAME;
export const hasSustainStage = (envelope) =>
  envelope && envelope.sustain !== undefined;
export const isPropertyDifferent = (current, target) => current !== target;

export const canApplyPortamento = (instrument, glideSetting) =>
  isSettingDefined(glideSetting) && !isMetalSynth(instrument);

export const canApplyDetune = (instrument, detuneSetting) =>
  isSettingDefined(detuneSetting) && instrument && instrument.detune;

export const canApplyFilterQ = (instrument, qSetting) =>
  isSettingDefined(qSetting) && instrument && instrument.filter;

export const canApplyFilterOctaves = (instrument, octavesSetting) =>
  isSettingDefined(octavesSetting) && instrument && instrument.filterEnvelope;

export const canApplyPan = (synthInstance, panSetting) =>
  isSettingDefined(panSetting) && synthInstance && synthInstance.panner?.pan;

export const canApplyFilterCutoff = (synthInstance, cutoffSetting) =>
  isSettingDefined(cutoffSetting) &&
  synthInstance &&
  synthInstance.fxFilter?.frequency;

export const canApplyRackFilterQ = (synthInstance, qSetting) =>
  isSettingDefined(qSetting) && synthInstance && synthInstance.fxFilter?.Q;
