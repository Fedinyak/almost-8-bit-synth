import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_RELEASE,
  AUDIO_DEFAULT_VOLUME,
} from './audioEngineConfig';

export const SOUND_PARAM_GROUPS = [
  { key: 'envelope', label: 'ENVELOPE:' },
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
  kick: { decay: 0.12, volume: -10 },
  snare: { decay: 0.1, volume: -12 },
  hiHat: { decay: 0.05, volume: -14 },
  hiHatClose: { decay: 0.04, volume: -14 },
  hiHatOpen: { decay: 0.35, volume: -12 },
  crash: { decay: 1.8, volume: -10 },
  ride: { decay: 0.8, volume: -12 },
  tom: { decay: 0.4, volume: -12 },
};
