export const ANALYSER_TYPE = 'waveform';
export const ANALYSER_SIZE = 32;

// --- НАСТРОЙКИ ПАРАМЕТРОВ АВТОМАТИЗАЦИИ И ЭФФЕКТОВ ---
export const WET_PARAM_KEY = 'wet';
export const NATIVE_VALUE_KEY = 'value';
export const EFFECT_STARTED_STATE = 'started';
export const BYPASS_WET_VALUE = 0;

// --- ДЕФОЛТНЫЕ СТУДИЙНЫЕ ЗНАЧЕНИЯ ---
export const AUDIO_DEFAULT_ATTACK = 0.005;
export const AUDIO_DEFAULT_DECAY = 0.1;
export const AUDIO_DEFAULT_SUSTAIN = 0.3;
export const AUDIO_DEFAULT_RELEASE = 0.3;
export const AUDIO_DEFAULT_VOLUME = -12;
export const AUDIO_DEFAULT_CUTOFF = 10000;

// --- ДИАПАЗОНЫ ОРГАНОВ УПРАВЛЕНИЯ UI ---
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

/**
 * ОПТИМИЗИРОВАННЫЕ ПРЕСЕТЫ ГРОМКОСТИ УДАРНЫХ (STUDIO BALANCED)
 * Значения подняты для обеспечения пробивного панча и правильного RMS-баланса микса.
 */
export const RAW_DRUM_PRESETS = {
  kick: {
    engineType: 'membraneSynth',
    volume: -6, // Буст для плотного кача внизу
    attack: 0.005,
    decay: 0.12,
    release: 0.3,
  },
  snare: {
    engineType: 'noiseSynth',
    volume: -8, // Поднято, чтобы пробивал сквозь плотные лиды синтов
    attack: 0.005,
    decay: 0.1,
    release: 0.3,
  },
  hiHat: {
    engineType: 'metalSynth',
    volume: -10,
    attack: 0.005,
    decay: 0.05,
    release: 0.3,
  },
  hiHatClose: {
    engineType: 'metalSynth',
    volume: -9, // Оптимизированный баланс закрытого хэта
    attack: 0.005,
    decay: 0.04,
    release: 0.3,
  },
  hiHatOpen: {
    engineType: 'metalSynth',
    volume: -7, // Поднято для яркого хвоста открытого хэта
    attack: 0.005,
    decay: 0.3,
    release: 0.3,
  },
  crash: {
    engineType: 'metalSynth',
    volume: -6, // Выверенный пиковый уровень для акцентов краша
    attack: 0.01,
    decay: 1.5,
    release: 0.3,
  },
  ride: {
    engineType: 'metalSynth',
    volume: -8,
    attack: 0.001,
    decay: 0.8,
    release: 0.3,
  },
  tom: {
    engineType: 'membraneSynth',
    volume: -8, // Буст для плотного тона томов
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
