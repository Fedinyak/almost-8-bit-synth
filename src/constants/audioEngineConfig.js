export const ANALYSER_TYPE = 'waveform';
export const ANALYSER_SIZE = 32;

// --- СТАТИЧЕСКИЕ ПЕРЕЧИСЛЕНИЯ ТРАНСПОРТА И ПЛЕЙХЕДА ---
export const PLAYBACK_STATES = {
  START: 'start',
  STOP: 'stop',
  PAUSE: 'pause',
};

export const PATTERN_ACTION_TYPES = {
  PLAY: 'PLAY',
  LOOP: 'LOOP',
  SELECT: 'SELECT',
  TOGGLE_FOLLOW: 'TOGGLE_FOLLOW',
};

// --- НАСТРОЙКИ ПАРАМЕТРОВ АВТОМАТИЗАЦИИ И ЭФФЕКТОВ ---
export const WET_PARAM_KEY = 'wet';
export const NATIVE_VALUE_KEY = 'value';
export const EFFECT_STARTED_STATE = 'started';
export const BYPASS_WET_VALUE = 0;

// --- СТАНДАРТНЫЕ ФОРМЫ ВОЛН (OSCILLATOR TYPES) ---
export const WAVEFORM_SQUARE = 'square';
export const WAVEFORM_SAWTOOTH = 'sawtooth';
export const WAVEFORM_TRIANGLE = 'triangle';

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

// --- ДЕФОЛТНЫЕ ПАРАМЕТРЫ СИСТЕМЫ МОДУЛЯЦИИ LFO ---
export const LFO_DEFAULT_PAN_VALUE = 0.0;
export const LFO_DEFAULT_ACTIVE_STATE = false;
export const LFO_DEFAULT_RATE_HZ = 5.0;
export const LFO_DEFAULT_DEPTH_MULTIPLIER = 0.5;
export const LFO_DEFAULT_WAVEFORM = 'sine';
export const LFO_DEFAULT_TARGET_PARAM = 'filterLowpassCutoff';

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

// --- СИСТЕМНЫЕ МАРКЕРЫ ДЛЯ ДИНАМИЧЕСКОГО МАППИНГА ФАСАДОВ ---
export const STRATEGY_TYPE_OSCILLATOR = 'oscillator';
export const STRATEGY_TYPE_NESTED = 'nested';
export const STRATEGY_TYPE_VALUE = 'value';
export const METHOD_NAME_SET_RELEASE = 'setRelease';

// --- ДЕКЛАРАТИВНЫЕ СТРАТЕГИИ КОММУТАЦИИ АУДИОГРАФА В РЭКЕ ---
export const ROUTING_STRATEGY_NATIVE = 'native_node';
export const ROUTING_STRATEGY_ADAPTER = 'adapter_internal';

// --- ИНФРАСТРУКТУРНЫЕ И ФИЗИЧЕСКИЕ НАСТРОЙКИ ДВИЖКОВ ---
export const INFRA_PARAM_MUTATION_EPSILON = 0.0001;
export const INFRA_SCHEDULING_LOOKAHEAD_SEC = 0.01;
export const INFRA_DRUM_PHASE_OFFSET = 0.001;

export const DRUM_ABSOLUTE_MIN_RAMP_TIME_SEC = 0.002;
export const DRUM_DEBUG_DESTINATION_GAIN = 0.05;

export const DSP_NOISE_BUFFER_DURATION_SEC = 2.0;
export const DSP_KICK_START_FREQ_HZ = 180;
export const DSP_KICK_END_FREQ_HZ = 45;
export const DSP_KICK_PITCH_DECAY_SEC = 0.08;
export const DSP_SNARE_FILTER_FREQ_HZ = 1000;
export const DSP_SNARE_FILTER_Q_VALUE = 1.0;
export const DSP_HATHAT_FILTER_FREQ_HZ = 3000;

export const SYNTH_DEFAULT_FILTER_Q_VALUE = 1.0;
export const SYNTH_DEFAULT_PLAYBACK_DURATION_SEC = 0.2;

// --- КОНСТАНТЫ СИСТЕМЫ МУЗЫКАЛЬНОГО ВРЕМЕНИ И ТРЕКЕРНОГО ПАРСИНГА ---
export const TIME_VALID_COORDINATES_COUNT = 3;
export const TIME_BEATS_INDEX = 1;
export const TIME_SIXTEENTHS_INDEX = 2;
export const TIME_FALLBACK_SECONDS_VALUE = 0;
export const TIME_STRING_SPLIT_CHAR = ':';

export const SIGNAL_MAX_AMPLITUDE = 1.0;
export const INITIAL_PANNER_CENTER_VALUE = 0.0;
