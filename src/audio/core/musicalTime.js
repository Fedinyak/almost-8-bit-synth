import { transport } from './transport';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СЕТКИ СЕКВЕНСОРА ---
const BEATS_PER_MEASURE = 4; // Количество четвертных долей в одном такте (паттерне)
const STEPS_PER_BEAT = 4; // Количество 16-х шагов в одной четвертной доле
const SECONDS_IN_MINUTE = 60; // Секунд в минуте для расчета BPM

// --- СТАНДАРТНЫЕ МУЗЫКАЛЬНЫЕ ИДЕНТИФИКАТОРЫ И ФОЛБЕКИ ---
const SIXTEENTH_NOTE_ID = '16n'; // Идентификатор 16-й ноты в формате Tone.js
const DEFAULT_16TH_DURATION_SEC = 0.125; // Длительность 16-й ноты в секундах при дефолтных 120 BPM

// Внутренний хелпер для получения текущей длительности четверти
const getSecondsPerBeat = () => SECONDS_IN_MINUTE / transport.bpm;

export const musicalTime = {
  /**
   * Перевод музыкальных тактов (номеров паттернов) в физические секунды
   * @param {number} numberOfMeasures - Количество тактов/паттернов
   * @returns {number} Секунды
   */
  measuresToSeconds(numberOfMeasures) {
    const secondsPerMeasure = getSecondsPerBeat() * BEATS_PER_MEASURE;
    return numberOfMeasures * secondsPerMeasure;
  },

  /**
   * Перевод длительности шага сетки (rate) в физические секунды
   * @param {string|number} rate - Шаг сетки (например, '16n') или число секунд
   * @returns {number} Секунды
   */
  noteToSeconds(rate) {
    if (typeof rate === 'number') return rate;
    if (rate === SIXTEENTH_NOTE_ID) return getSecondsPerBeat() / STEPS_PER_BEAT;

    return DEFAULT_16TH_DURATION_SEC;
  },
};
