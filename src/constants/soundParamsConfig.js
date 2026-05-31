import * as Tone from 'tone';
import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_CUTOFF,
} from './audioEngineConfig';

const RANGE_VOLUME_DB = { min: -60, max: 0, step: 1 };
const RANGE_TIME_ADR = { min: 0.01, max: 3.0, step: 0.01 };
const RANGE_MIX_WET = { min: 0.0, max: 1.0, step: 0.05 };
const RANGE_FILTER_HZ = { min: 20, max: 10000, step: 10 };

export const SOUND_PARAM_GROUPS = [
  { key: 'envelope', label: 'ENVELOPE:' },
  { key: 'filter', label: 'FILTER:' },
  { key: 'effects', label: 'EFFECTS:' },
];

export const SOUND_PARAMS = {
  attack: {
    min: 0.005, // Оставляем защитный микро-минимум от щелчка на старте ноты
    max: 2.0,
    step: 0.005,
    default: AUDIO_DEFAULT_ATTACK,
    label: 'ATTACK',
    group: 'envelope',
  },
  decay: {
    ...RANGE_TIME_ADR,
    default: AUDIO_DEFAULT_DECAY,
    label: 'DECAY',
    group: 'envelope',
  },
  sustain: {
    ...RANGE_MIX_WET,
    default: AUDIO_DEFAULT_SUSTAIN,
    label: 'SUSTAIN',
    group: 'envelope',
  },
  release: {
    ...RANGE_TIME_ADR,
    default: AUDIO_DEFAULT_RELEASE,
    label: 'RELEASE',
    group: 'envelope',
  },
  volume: {
    ...RANGE_VOLUME_DB,
    default: AUDIO_DEFAULT_VOLUME,
    label: 'VOLUME',
    group: 'envelope',
  },

  filterCutoff: {
    ...RANGE_FILTER_HZ,
    default: AUDIO_DEFAULT_CUTOFF,
    label: 'CUTOFF HZ',
    isEffect: true,
    nodeKey: 'fxFilter',
    bypassValue: 10000, // В крайнем положении фильтр полностью усыпляется, экономя ЦП
    group: 'filter',
  },

  bitcrusherWet: {
    ...RANGE_MIX_WET,
    default: 0.0,
    label: 'CRUSHER MIX',
    isEffect: true,
    nodeKey: 'fxBitcrusher',
    bypassValue: 0.0,
    group: 'effects',
  },
  delayWet: {
    ...RANGE_MIX_WET,
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
    attack: 0.005,
    decay: 0.12,
    release: 0.3,
  },
  snare: {
    volume: -12,
    attack: 0.005,
    decay: 0.1,
    release: 0.3,
  },
  hiHat: {
    volume: -12,
    attack: 0.005,
    decay: 0.05,
    release: 0.3,
  },
  hiHatClose: {
    volume: -12,
    attack: 0.005,
    decay: 0.04,
    release: 0.3,
  },
  hiHatOpen: {
    volume: -10,
    attack: 0.005,
    decay: 0.3,
    release: 0.3,
  },
  crash: {
    volume: -8,
    attack: 0.01,
    decay: 1.5,
    release: 0.3,
  },
  ride: {
    volume: -10,
    attack: 0.001,
    decay: 0.8,
    release: 0.3,
  },
  tom: {
    volume: -12,
    pitchDecay: 0.08,
    octaves: 4,
    attack: 0.005,
    decay: 0.4,
    release: 0.3,
  },
};

export const EFFECT_DEVICES = {
  crusher: {
    nodeKey: 'fxBitcrusher',
    ClassRef: Tone.BitCrusher,
    defaultParams: { bits: 4 },
  },
  filter: {
    nodeKey: 'fxFilter',
    ClassRef: Tone.Filter,
    defaultParams: { type: 'lowpass', frequency: 10000 },
  },
  delay: {
    nodeKey: 'fxDelay',
    ClassRef: Tone.FeedbackDelay,
    defaultParams: { delayTime: '8n', feedback: 0.25 },
  },
};

export const DRUM_EFFECTS_CHAIN = ['crusher', 'filter', 'delay'];

export const SYNTH_PRESETS = {
  synth1: {
    oscillatorType: 'square',
    volume: -14,
    attack: 0.005,
    decay: 0.2,
    sustain: 0.3,
    release: 0.15,
    filterCutoff: 4500,
    delayWet: 0.25,
    bitcrusherWet: 0.15,
  },
  synth2: {
    oscillatorType: 'triangle',
    volume: -10,
    attack: 0.005,
    decay: 0.5,
    sustain: 0.6,
    release: 0.2,
    filterCutoff: 800,
    delayWet: 0.0,
    bitcrusherWet: 0.0,
  },
};
