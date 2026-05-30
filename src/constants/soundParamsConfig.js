import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_CUTOFF,
} from './audioEngineConfig';

export const SOUND_PARAM_GROUPS = [
  { key: 'envelope', label: 'ENVELOPE:' },
  { key: 'filter', label: 'FILTER:' },
  { key: 'effects', label: 'EFFECTS:' },
];

export const SOUND_PARAMS = {
  attack: {
    min: 0.005,
    max: 2.0,
    step: 0.005,
    default: AUDIO_DEFAULT_ATTACK,
    label: 'ATTACK',
    group: 'envelope',
  },
  decay: {
    min: 0.01,
    max: 3.0,
    step: 0.01,
    default: AUDIO_DEFAULT_DECAY,
    label: 'DECAY',
    group: 'envelope',
  },
  sustain: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: AUDIO_DEFAULT_SUSTAIN,
    label: 'SUSTAIN',
    group: 'envelope',
  },
  release: {
    min: 0.01,
    max: 3.0,
    step: 0.01,
    default: AUDIO_DEFAULT_RELEASE,
    label: 'RELEASE',
    group: 'envelope',
  },
  volume: {
    min: -60,
    max: 0,
    step: 1,
    default: AUDIO_DEFAULT_VOLUME,
    label: 'VOLUME',
    group: 'envelope',
  },

  filterCutoff: {
    min: 20,
    max: 10000,
    step: 10,
    default: AUDIO_DEFAULT_CUTOFF,
    label: 'CUTOFF HZ',
    isEffect: true,
    nodeKey: 'fxFilter',
    bypassValue: 10000, // В крайнем положении фильтр полностью усыпляется, экономя ЦП
    group: 'filter',
  },

  bitcrusherWet: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.0,
    label: 'CRUSHER MIX',
    isEffect: true,
    nodeKey: 'fxBitcrusher',
    bypassValue: 0.0,
    group: 'effects',
  },
  delayWet: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.0,
    label: 'DELAY MIX',
    isEffect: true,
    nodeKey: 'fxDelay',
    bypassValue: 0.0,
    group: 'effects',
  },
};

export const DRUM_PRESETS = {
  kick: {
    volume: -10,
    envelope: { attack: 0.005, decay: 0.12, release: 0.3 },
  },
  snare: {
    volume: -12,
    envelope: { attack: 0.005, decay: 0.1, release: 0.3 },
  },
  hiHat: {
    volume: -12,
    envelope: { attack: 0.005, decay: 0.05, release: 0.3 },
  },
  hiHatClose: {
    volume: -12,
    envelope: { attack: 0.005, decay: 0.04, release: 0.3 },
  },
  hiHatOpen: {
    volume: -10,
    envelope: { attack: 0.005, decay: 0.3, release: 0.3 },
  },
  crash: {
    volume: -8,
    envelope: { attack: 0.01, decay: 1.5, release: 0.3 },
  },
  ride: {
    volume: -10,
    envelope: { attack: 0.001, decay: 0.8, release: 0.3 },
  },
  tom: {
    volume: -12,
    pitchDecay: 0.08,
    octaves: 4,
    envelope: { attack: 0.005, decay: 0.4, release: 0.3 },
  },
};
