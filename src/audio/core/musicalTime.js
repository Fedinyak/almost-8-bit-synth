import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';

// --- МАТЕМАТИЧЕСКИЕ КОНСТАНТЫ СЕТКИ ВРЕМЕНИ ---
const SECONDS_IN_MINUTE = 60;
const SIXTEENTH_NOTE_ID = '16n';
const BASE_NUMBER_RADIX = 10;

// В одной доле (четверти) всегда фиксированное количество 16-х шагов
const STEPS_PER_BEAT = 4;
// Стандартное количество долей в одном такте (размер 4/4)
const BEATS_PER_MEASURE = 4;

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ (ПРОВЕРКИ СОСТОЯНИЯ) ---

const isSixteenthNoteRate = (rate) => rate === SIXTEENTH_NOTE_ID;

const isInvalidTimeFormat = (timeStr) => {
  const expectedPartsCount = 3;
  return timeStr.split(':').length !== expectedPartsCount;
};

// --- ЧИСТАЯ МАТЕМАТИКА ТЕМПА И СЕТКИ (PURE FUNCTIONS) ---

/**
 * Рассчитывает длительность одной четвертной доли (Beat) в физических секундах
 */
export const calculateSecondsPerBeat = (bpm) => SECONDS_IN_MINUTE / bpm;

/**
 * Рассчитывает длительность одного 16-го шага (Tick) в физических секундах
 */
export const calculateSecondsPerTick = (bpm) =>
  calculateSecondsPerBeat(bpm) / STEPS_PER_BEAT;

/**
 * Рассчитывает общую длительность одного полного музыкального такта (паттерна) в секундах
 */
export const calculateSecondsPerMeasure = (bpm) =>
  calculateSecondsPerBeat(bpm) * BEATS_PER_MEASURE;

/**
 * Безопасный парсинг строковой координаты трекера в числовой шаг
 */
const parseCoordinatePart = (partString) =>
  parseInt(partString, BASE_NUMBER_RADIX) || 0;

// --- АБСТРАКЦИИ КОНВЕРТАЦИИ ВРЕМЕНИ ---

/**
 * Перевод музыкальных тактов (номеров паттернов) в физические секунды на основе живого BPM
 */
const measuresToSeconds = (numberOfMeasures, bpm) =>
  numberOfMeasures * calculateSecondsPerMeasure(bpm);

/**
 * Парсинг музыкальной строки трекера '0:1:2' в относительные секунды внутри одного паттерна
 */
const parsePositionToSeconds = (timeStr, bpm) => {
  if (isInvalidTimeFormat(timeStr)) return 0;

  const timeCoordinates = timeStr.split(':');

  const measures = parseCoordinatePart(timeCoordinates[0]);
  const beats = parseCoordinatePart(timeCoordinates[1]);
  const sixteenths = parseCoordinatePart(timeCoordinates[2]);

  const secondsPerBeat = calculateSecondsPerBeat(bpm);
  const secondsPerMeasure = calculateSecondsPerMeasure(bpm);
  const secondsPerStep = calculateSecondsPerTick(bpm);

  return (
    measures * secondsPerMeasure +
    beats * secondsPerBeat +
    sixteenths * secondsPerStep
  );
};

/**
 * Расчет абсолютных физических секунд для ноты с учетом её позиции и индекса такта
 */
const calculateAbsoluteSeconds = (musicalTimeValue, measureIndex, bpm) => {
  const stepSeconds =
    typeof musicalTimeValue === 'string'
      ? parsePositionToSeconds(musicalTimeValue, bpm)
      : musicalTimeValue;

  const measureSeconds = measureIndex * calculateSecondsPerMeasure(bpm);

  return stepSeconds + measureSeconds;
};

/**
 * Перевод строковой или числовой длительности шага сетки в физические секунды
 */
const noteToSeconds = (rate, bpm) => {
  if (typeof rate === 'number') return rate;
  if (isSixteenthNoteRate(rate)) return calculateSecondsPerTick(bpm);

  const defaultBpmFallback = SEQUENCER_CONFIG.DEFAULT_BPM || 120;
  return calculateSecondsPerTick(defaultBpmFallback);
};

/**
 * Вычисление точного времени AudioContext для физического воспроизведения ноды
 */
const calculateExactAudioTime = (
  projectedTime,
  currentTransportTime,
  currentContextTime,
) => {
  const timeOffset = projectedTime - currentTransportTime;
  return currentContextTime + timeOffset;
};

// --- СИСТЕМНЫЙ ЛУП РЕПИТЕРА ГРАФИКИ (ОПТИМИЗИРОВАННЫЙ СЧЕТЧИК) ---

/**
 * Рассчитывает следующую опорную временную точку для запуска триггера графики
 */
const calculateNextRepeatTime = (lastScheduledTime, interval) => {
  const baseNextTime = Math.ceil(lastScheduledTime / interval) * interval;
  const isTimeBehindOrEqual = baseNextTime <= lastScheduledTime;

  return isTimeBehindOrEqual ? baseNextTime + interval : baseNextTime;
};

/**
 * Декларативный прогон цикла планирования долей репитера внутри скользящего окна Look-Ahead.
 * Используется графическим движком draw.js для синхронизации мигания интерфейса.
 */
const advanceRepeaterLoop = (
  repeater,
  currentSeconds,
  scheduleUntilTime,
  now,
  bpm,
) => {
  const interval = isSixteenthNoteRate(repeater.rate)
    ? calculateSecondsPerTick(bpm)
    : repeater.interval;

  let nextRepeatTime = calculateNextRepeatTime(
    repeater.lastScheduledTime,
    interval,
  );

  while (nextRepeatTime <= scheduleUntilTime) {
    const exactAudioTime = calculateExactAudioTime(
      nextRepeatTime,
      currentSeconds,
      now,
    );

    repeater.callback(exactAudioTime);
    repeater.lastScheduledTime = nextRepeatTime;

    nextRepeatTime += interval;
  }
};

// --- ЕДИНЫЙ ЭКСПОРТ ДЕКЛАРАТИВНОГО API МОДУЛЯ ---

export const musicalTime = {
  measuresToSeconds,
  parsePositionToSeconds,
  calculateAbsoluteSeconds,
  noteToSeconds,
  calculateExactAudioTime,
  advanceRepeaterLoop,
};
