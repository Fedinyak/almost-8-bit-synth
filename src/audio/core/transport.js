import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';
import { SECONDS_IN_MINUTE, STEPS_PER_BEAT } from '../../constants/constants';
import { getStepsPerPattern } from '../../utils/audioMathUtils';

// --- ВНУТРЕННИЙ МУТАБЕЛЬНЫЙ СТЕЙТ ТРАНСПОРТА ---
let isPlayingState = false;
let currentBpmValue = SEQUENCER_CONFIG.DEFAULT_BPM || 120;

// --- ЧИСТЫЕ МАТЕМАТИЧЕСКИЕ ВЫЧИСЛЕНИЯ (PURE FUNCTIONS) ---

/**
 * Вычисляет длительность одного музыкального тика (16-го шага) в физических секундах
 */
const calculateSecondsPerTick = (bpm) => {
  const secondsPerBeat = SECONDS_IN_MINUTE / bpm;
  return secondsPerBeat / STEPS_PER_BEAT;
};

/**
 * Вычисляет полную длительность одного музыкального такта (паттерна) в физических секундах
 */
const calculateSecondsPerMeasure = (bpm) =>
  calculateSecondsPerTick(bpm) * getStepsPerPattern();

// --- ПУБЛИЧНЫЙ API МОДУЛЯ ТРАНСПОРТА (FACADE) ---

export const transport = {
  get bpm() {
    return currentBpmValue;
  },
  set bpm(value) {
    currentBpmValue = value;
  },

  get isPlaying() {
    return isPlayingState;
  },

  /**
   * Возвращает точную длительность одного 16-го шага в физических секундах на основе текущего темпа
   */
  getSecondsPerTick() {
    return calculateSecondsPerTick(currentBpmValue);
  },

  /**
   * Возвращает длительность одного полного паттерна в физических секундах на основе текущего темпа
   */
  getSecondsPerMeasure() {
    return calculateSecondsPerMeasure(currentBpmValue);
  },

  start() {
    isPlayingState = true;
  },

  pause() {
    isPlayingState = false;
  },

  stop() {
    isPlayingState = false;
  },

  /**
   * Декларативная диспетчеризация состояния воспроизведения из Redux UI слоя
   */
  setPlayState(state) {
    if (state === 'start') {
      transport.start();
    } else if (state === 'pause') {
      transport.pause();
    } else {
      transport.stop();
    }
  },
};
