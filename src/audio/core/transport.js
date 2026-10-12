import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СИСТЕМЫ ---
const SECONDS_IN_MINUTE = 60;
const STEPS_PER_BEAT = 4; // Четыре 16-х шага в одной четверти

let isPlaying = false;
let currentBpm = SEQUENCER_CONFIG.DEFAULT_BPM || 120;

// НАСТОЯЩИЙ PLAYHEAD: Сквозная позиция плеера в музыкальных тиках (16-х шагах)
let playheadTicks = 0;

export const transport = {
  get bpm() {
    return currentBpm;
  },
  set bpm(value) {
    currentBpm = value;
  },

  get isPlaying() {
    return isPlaying;
  },

  // Геттер и сеттер для Playhead курсора в тиках
  get ticks() {
    return playheadTicks;
  },
  set ticks(value) {
    playheadTicks = value;
  },

  /**
   * МАТЕМАТИКА PPQ: Вычисляет точную длительность одного 16-го шага (импульса) в физических секундах
   */
  getSecondsPerTick() {
    const secondsPerBeat = SECONDS_IN_MINUTE / currentBpm;
    return secondsPerBeat / STEPS_PER_BEAT;
  },

  /**
   * Вычисляет длительность одного музыкального такта (16 шагов) в секундах
   */
  getSecondsPerMeasure() {
    return transport.getSecondsPerTick() * 16;
  },

  start() {
    isPlaying = true;
  },

  pause() {
    isPlaying = false;
  },

  stop() {
    isPlaying = false;
    playheadTicks = 0; // Полный физический сброс Playhead в начало ленты нот
  },

  setPlayState(state) {
    switch (state) {
      case 'start':
        transport.start();
        break;
      case 'pause':
        transport.pause();
        break;
      default:
        transport.stop();
        break;
    }
  },
};
