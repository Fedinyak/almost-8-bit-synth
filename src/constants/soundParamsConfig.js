import * as Tone from 'tone';
import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_CUTOFF,
  RANGE_VOLUME_DB,
  RANGE_TIME_ADR,
  RANGE_MIX_WET,
  RANGE_FILTER_HZ,
  ALL_ENGINES,
  RAW_DRUM_PRESETS,
  STATIC_DRUM_TYPE_MAP,
} from './audioEngineConfig';

// ============================================================================
// 1. ГЛОБАЛЬНЫЕ ТЕКСТОВЫЕ СЛОВАРИ
// ============================================================================
export const TEXT_PARAM_DICTIONARIES = {
  NOTE_VALUES: {
    options: ['1/2', '1/4', '1/8', '1/16', '1/32'], // Отображение в UI
    audioValues: ['2n', '4n', '8n', '16n', '32n'], // Команда для Tone.js
  },
};

export const SOUND_PARAM_GROUPS = [
  { key: 'envelope', label: 'ENVELOPE:' },
  { key: 'filter', label: 'FILTER:' },
];

// ============================================================================
// 2. ЖЕЛЕЗНЫЕ ДЕВАЙСЫ ДЛЯ АУДИО-ДВИЖКА (Сюда добавили Сатуратор и Хорус)
// ============================================================================
export const EFFECT_DEVICES = {
  saturator: {
    nodeKey: 'fxSaturator',
    ClassRef: Tone.Chebyshev,
    defaultParams: { order: 3 },
    label: 'SATURATOR',
    groupKey: 'saturator',
    activeKey: 'saturatorActive',
  }, // 🆕 Сатуратор для жира
  crusher: {
    nodeKey: 'fxBitcrusher',
    ClassRef: Tone.BitCrusher,
    defaultParams: { bits: 4 },
    label: 'BITCRUSHER',
    groupKey: 'crusher',
    activeKey: 'bitcrusherActive',
  },
  distortion: {
    nodeKey: 'fxDistortion',
    ClassRef: Tone.Distortion,
    defaultParams: { distortion: 1.5, oversample: '4x' },
    label: 'DISTORTION',
    groupKey: 'distortion',
    activeKey: 'distortionActive',
  },
  filter: {
    nodeKey: 'fxFilter',
    ClassRef: Tone.Filter,
    defaultParams: { type: 'lowpass', frequency: 10000 },
    label: 'LOWPASS FILTER',
    groupKey: 'filter',
  },
  filterHigh: {
    nodeKey: 'fxFilterHigh',
    ClassRef: Tone.Filter,
    defaultParams: { type: 'highpass', frequency: 20 },
    label: 'HIGHPASS FILTER',
    groupKey: 'filter',
  },
  chorus: {
    nodeKey: 'fxChorus',
    ClassRef: Tone.Chorus,
    defaultParams: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
    label: 'CHORUS / FLANGER',
    groupKey: 'chorus',
    activeKey: 'chorusActive',
  }, // 🆕 Космический хорус
  delay: {
    nodeKey: 'fxDelay',
    ClassRef: Tone.FeedbackDelay,
    defaultParams: { delayTime: 0.25, feedback: 0.25 },
    label: 'DELAY',
    groupKey: 'delay',
    activeKey: 'delayActive',
  },
  pingpong: {
    nodeKey: 'fxPingPong',
    ClassRef: Tone.PingPongDelay,
    defaultParams: { delayTime: 0.25, feedback: 0.3 },
    label: 'PING-PONG DELAY',
    groupKey: 'pingpong',
    activeKey: 'pingpongActive',
  },
};

// СЕТКИ И ПОРЯДОК ЦЕПОЧЕК ЭФФЕКТОВ (Включаем новые модули в общую цепь)
export const DRUM_EFFECTS_CHAIN = [
  'saturator',
  'crusher',
  'distortion',
  'filter',
  'filterHigh',
  'chorus',
  'delay',
  'pingpong',
];
export const UI_EFFECTS_LIST = [
  'saturator',
  'crusher',
  'distortion',
  'chorus',
  'delay',
  'pingpong',
];

// 🔥 АВТО-СБОРЩИК ДЕФОЛТОВ: Теперь он автоматически выставит saturatorActive: false и chorusActive: false на лету!
const DEFAULT_FX_SWITCHES = Object.values(EFFECT_DEVICES).reduce((acc, dev) => {
  if (dev.activeKey) acc[dev.activeKey] = false;
  return acc;
}, {});

// ============================================================================
// 3. РАБОЧИЙ ПАСПОРТ РУЧЕК (Добавили Detune, Сатуратор и Хорус)
// ============================================================================
export const SOUND_PARAMS = {
  attack: {
    min: 0.005,
    max: 2.0,
    step: 0.005,
    default: AUDIO_DEFAULT_ATTACK,
    label: 'ATTACK',
    group: 'envelope',
    supportedEngines: ALL_ENGINES,
  },
  decay: {
    ...RANGE_TIME_ADR,
    default: AUDIO_DEFAULT_DECAY,
    label: 'DECAY',
    group: 'envelope',
    supportedEngines: ALL_ENGINES,
  },
  sustain: {
    ...RANGE_MIX_WET,
    default: AUDIO_DEFAULT_SUSTAIN,
    label: 'SUSTAIN',
    group: 'envelope',
    supportedEngines: ['monoSynth'],
  },
  release: {
    ...RANGE_TIME_ADR,
    default: AUDIO_DEFAULT_RELEASE,
    label: 'RELEASE',
    group: 'envelope',
    supportedEngines: ['monoSynth', 'membraneSynth'],
  },
  volume: {
    ...RANGE_VOLUME_DB,
    default: AUDIO_DEFAULT_VOLUME,
    label: 'VOLUME',
    group: 'envelope',
    supportedEngines: ALL_ENGINES,
  },
  detune: {
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    label: 'DETUNE (OSC CENT)',
    group: 'envelope',
    supportedEngines: ALL_ENGINES,
  }, // 🆕 Расстройка для жира баса
  synthGlide: {
    min: 0.0,
    max: 0.5,
    step: 0.01,
    default: 0.0,
    label: 'GLIDE (GLIDE/PORTAMENTO)',
    group: 'envelope',
    supportedEngines: ['monoSynth'],
  },

  filterLowpassCutoff: {
    ...RANGE_FILTER_HZ,
    default: AUDIO_DEFAULT_CUTOFF,
    label: 'LOWPASS CUTOFF HZ',
    isEffect: true,
    nodeKey: 'fxFilter',
    targetParam: 'frequency',
    bypassValue: 10000,
    group: 'filter',
    supportedEngines: ALL_ENGINES,
  },
  filterHighpassCutoff: {
    ...RANGE_FILTER_HZ,
    default: 20,
    label: 'HIGHPASS CUTOFF HZ',
    isEffect: true,
    nodeKey: 'fxFilterHigh',
    targetParam: 'frequency',
    bypassValue: 20,
    group: 'filter',
    supportedEngines: ALL_ENGINES,
  },
  filterQ: {
    min: 1.0,
    max: 15.0,
    step: 0.5,
    default: 1.0,
    label: 'RESONANCE (Q)',
    group: 'filter',
    targetParam: 'Q',
    supportedEngines: ALL_ENGINES,
  },
  filterEnvOctaves: {
    min: 0.0,
    max: 6.0,
    step: 0.5,
    default: 0.0,
    label: 'ENV MOD (OCTAVES)',
    group: 'filter',
    supportedEngines: ['monoSynth'],
  },

  saturatorWet: {
    ...RANGE_MIX_WET,
    default: 0.35,
    label: 'SATURATOR MIX',
    isEffect: true,
    nodeKey: 'fxSaturator',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'saturator',
    supportedEngines: ALL_ENGINES,
  }, // 🆕 Слайдеры сатуратора
  saturatorOrder: {
    min: 1,
    max: 6,
    step: 1,
    default: 3,
    label: 'SATURATOR DRIVE (ORDER)',
    isEffect: true,
    nodeKey: 'fxSaturator',
    targetParam: 'order',
    group: 'saturator',
    supportedEngines: ALL_ENGINES,
  },

  bitcrusherWet: {
    ...RANGE_MIX_WET,
    default: 0.4,
    label: 'CRUSHER MIX',
    isEffect: true,
    nodeKey: 'fxBitcrusher',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'crusher',
    supportedEngines: ALL_ENGINES,
  },
  bitcrusherBits: {
    min: 1,
    max: 8,
    step: 1,
    default: 4,
    label: 'CRUSHER BITS',
    isEffect: true,
    nodeKey: 'fxBitcrusher',
    targetParam: 'bits',
    group: 'crusher',
    supportedEngines: ALL_ENGINES,
  },

  distortionWet: {
    ...RANGE_MIX_WET,
    default: 0.35,
    label: 'DISTORTION MIX',
    isEffect: true,
    nodeKey: 'fxDistortion',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'distortion',
    supportedEngines: ALL_ENGINES,
  },
  distortionDrive: {
    min: 0.0,
    max: 2.0,
    step: 0.1,
    default: 1.2,
    label: 'DISTORTION DRIVE',
    isEffect: true,
    nodeKey: 'fxDistortion',
    targetParam: 'distortion',
    group: 'distortion',
    supportedEngines: ALL_ENGINES,
  },

  chorusWet: {
    ...RANGE_MIX_WET,
    default: 0.4,
    label: 'CHORUS MIX',
    isEffect: true,
    nodeKey: 'fxChorus',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'chorus',
    supportedEngines: ALL_ENGINES,
  }, // 🆕 Слайдеры космического хоруса
  chorusFrequency: {
    min: 0.1,
    max: 10.0,
    step: 0.1,
    default: 1.5,
    label: 'CHORUS SPEED (HZ)',
    isEffect: true,
    nodeKey: 'fxChorus',
    targetParam: 'frequency',
    group: 'chorus',
    supportedEngines: ALL_ENGINES,
  },
  chorusDepth: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.7,
    label: 'CHORUS DEPTH',
    isEffect: true,
    nodeKey: 'fxChorus',
    targetParam: 'depth',
    group: 'chorus',
    supportedEngines: ALL_ENGINES,
  },

  delayWet: {
    ...RANGE_MIX_WET,
    default: 0.3,
    label: 'DELAY MIX',
    isEffect: true,
    nodeKey: 'fxDelay',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'delay',
    supportedEngines: ALL_ENGINES,
  },
  delayFeedback: {
    min: 0.0,
    max: 0.95,
    step: 0.05,
    default: 0.4,
    label: 'DELAY FEEDBACK',
    isEffect: true,
    nodeKey: 'fxDelay',
    targetParam: 'feedback',
    group: 'delay',
    supportedEngines: ALL_ENGINES,
  },
  delayTime: {
    min: 0,
    max: 4,
    step: 1,
    default: 2,
    label: 'DELAY TIME',
    isEffect: true,
    nodeKey: 'fxDelay',
    targetParam: 'delayTime',
    group: 'delay',
    isTextParam: true,
    dictionaryKey: 'NOTE_VALUES',
    supportedEngines: ALL_ENGINES,
  },

  pingpongWet: {
    ...RANGE_MIX_WET,
    default: 0.35,
    label: 'PINGPONG MIX',
    isEffect: true,
    nodeKey: 'fxPingPong',
    targetParam: 'wet',
    bypassValue: 0.0,
    group: 'pingpong',
    supportedEngines: ALL_ENGINES,
  },
  pingpongFeedback: {
    min: 0.0,
    max: 0.95,
    step: 0.05,
    default: 0.4,
    label: 'PINGPONG FEEDBACK',
    isEffect: true,
    nodeKey: 'fxPingPong',
    targetParam: 'feedback',
    group: 'pingpong',
    supportedEngines: ALL_ENGINES,
  },
  pingpongTime: {
    min: 0,
    max: 4,
    step: 1,
    default: 2,
    label: 'PINGPONG TIME',
    isEffect: true,
    nodeKey: 'fxPingPong',
    targetParam: 'delayTime',
    group: 'pingpong',
    isTextParam: true,
    dictionaryKey: 'NOTE_VALUES',
    supportedEngines: ALL_ENGINES,
  },
};

// ============================================================================
// 4. ПРЕСЕТЫ СИНТОВ (Добавлены стартовые дефолты для сатуратора и хоруса)
// ============================================================================
export const SYNTH_PRESETS = {
  synth1: {
    ...DEFAULT_FX_SWITCHES,
    engineType: 'monoSynth',
    oscillatorType: 'square',
    volume: -14,
    attack: 0.005,
    decay: 0.2,
    sustain: 0.3,
    release: 0.15,
    detune: 0,
    filterLowpassCutoff: 4500,
    filterHighpassCutoff: 20,
    bitcrusherWet: 0.15,
    bitcrusherBits: 4,
    distortionWet: 0.0,
    distortionDrive: 1.5,
    delayWet: 0.3,
    delayFeedback: 0.4,
    delayTime: 2,
    pingpongWet: 0.35,
    pingpongFeedback: 0.4,
    pingpongTime: 2,
    synthGlide: 0.0,
    filterQ: 1.0,
    filterEnvOctaves: 0.0,
    saturatorWet: 0.35,
    saturatorOrder: 3,
    chorusWet: 0.4,
    chorusFrequency: 1.5,
    chorusDepth: 0.7, // 🆕 Инициализация значений
    bitcrusherActive: true,
    delayActive: true,
  },
  synth2: {
    ...DEFAULT_FX_SWITCHES,
    engineType: 'monoSynth',
    oscillatorType: 'triangle',
    volume: -10,
    attack: 0.005,
    decay: 0.5,
    sustain: 0.6,
    release: 0.2,
    detune: 0,
    filterLowpassCutoff: 800,
    filterHighpassCutoff: 20,
    delayTime: 2,
    pingpongWet: 0.35,
    pingpongFeedback: 0.4,
    pingpongTime: 2,
    synthGlide: 0.0,
    filterQ: 1.0,
    filterEnvOctaves: 0.0,
    saturatorWet: 0.35,
    saturatorOrder: 3,
    chorusWet: 0.4,
    chorusFrequency: 1.5,
    chorusDepth: 0.7,
  },
};

// ============================================================================
// 5. ДИНАМИЧЕСКИЙ СБОРЩИК БАРАБАНОВ (Вклеивает новые флаги автоматически)
// ============================================================================
export const DRUM_PRESETS = Object.entries(RAW_DRUM_PRESETS).reduce(
  (acc, [drumKey, drumConfig]) => {
    acc[drumKey] = { ...DEFAULT_FX_SWITCHES, ...drumConfig };
    return acc;
  },
  {},
);
export const DRUM_TYPE_MAP = STATIC_DRUM_TYPE_MAP;
