import { SEQUENCER_CONFIG } from './sequencerConfig';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СИСТЕМЫ ВРЕМЕНИ ---
export const SECONDS_IN_MINUTE = 60;
export const STEPS_PER_BEAT = 4; // Четыре 16-х шага в одной четверти (размер 4/4)

// --- НАСТРОЙКИ СЕТКИ СЕКВЕНСОРА (СИНХРОНИЗИРОВАНО С ГЛАВНЫМ КОНФИГОМ) ---
export const STEPS_IN_MEASURE = SEQUENCER_CONFIG.SEQUENCER_STEP || 16;
export const STEP_DURATION_NOTATION = '16n';

// --- НАСТРОЙКИ ЗВУКОВОГО ДВИЖКА И ТАЙМИНГОВ ---
export const DEFAULT_DRUM_RELEASE = '32n';
export const LOOKAHEAD_OFFSET_SEC = 0.005;

// --- СПИСКИ ДОСТУПНЫХ ИНСТРУМЕНТОВ ---
export const SYNTH_LIST = ['synth1', 'synth2'];

export const DRUM_KIT_LIST = [
  'kick',
  'snare',
  'hiHatClose',
  'hiHatOpen',
  'crash',
  'ride',
  'tom',
];
