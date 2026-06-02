export const ANALYSER_TYPE = 'waveform';
export const ANALYSER_SIZE = 32;

export const AUDIO_DEFAULT_ATTACK = 0.005;
export const AUDIO_DEFAULT_DECAY = 0.1;
export const AUDIO_DEFAULT_SUSTAIN = 0.3;
export const AUDIO_DEFAULT_RELEASE = 0.3;
export const AUDIO_DEFAULT_VOLUME = -12;
export const AUDIO_DEFAULT_CUTOFF = 10000;

export const RANGE_VOLUME_DB = { min: -60, max: 0, step: 1 };
export const RANGE_TIME_ADR = { min: 0.01, max: 3.0, step: 0.01 };
export const RANGE_MIX_WET = { min: 0.0, max: 1.0, step: 0.05 };
export const RANGE_FILTER_HZ = { min: 20, max: 10000, step: 10 };

export const ALL_ENGINES = [
  'monoSynth',
  'membraneSynth',
  'noiseSynth',
  'metalSynth',
];

export const RAW_DRUM_PRESETS = {
  kick: {
    engineType: 'membraneSynth',
    volume: -10,
    attack: 0.005,
    decay: 0.12,
    release: 0.3,
  },
  snare: {
    engineType: 'noiseSynth',
    volume: -12,
    attack: 0.005,
    decay: 0.1,
    release: 0.3,
  },
  hiHat: {
    engineType: 'metalSynth',
    volume: -12,
    attack: 0.005,
    decay: 0.05,
    release: 0.3,
  },
  hiHatClose: {
    engineType: 'metalSynth',
    volume: -12,
    attack: 0.005,
    decay: 0.04,
    release: 0.3,
  },
  hiHatOpen: {
    engineType: 'metalSynth',
    volume: -10,
    attack: 0.005,
    decay: 0.3,
    release: 0.3,
  },
  crash: {
    engineType: 'metalSynth',
    volume: -8,
    attack: 0.01,
    decay: 1.5,
    release: 0.3,
  },
  ride: {
    engineType: 'metalSynth',
    volume: -10,
    attack: 0.001,
    decay: 0.8,
    release: 0.3,
  },
  tom: {
    engineType: 'membraneSynth',
    volume: -12,
    pitchDecay: 0.08,
    octaves: 4,
    attack: 0.005,
    decay: 0.4,
    release: 0.3,
  },
};

export const STATIC_DRUM_TYPE_MAP = {
  kick: 'MembraneSynth',
  snare: 'NoiseSynth',
  hiHat: 'MetalSynth',
  hiHatClose: 'MetalSynth',
  hiHatOpen: 'MetalSynth',
  crash: 'MetalSynth',
  ride: 'MetalSynth',
  tom: 'MembraneSynth',
};
