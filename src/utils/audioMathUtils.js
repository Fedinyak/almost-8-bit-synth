import { getNativeContext } from '../audio/core/nativeContext';
// Живой нативный темп прямо из ядра
import { getCurrentEngineBpm } from '../audio/core/audioEngineCore';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';

const SIXTEENTH_STEPS_PER_BEAT = 4;
const VALID_TIME_COORDINATES_COUNT = 3;

/**
 * Получает количество шагов в одном паттерне из конфигурации
 */
export const getStepsPerPattern = () => SEQUENCER_CONFIG.SEQUENCER_STEP || 16;

/**
 * Вычисляет индекс паттерна (такта) на основе абсолютного тика
 */
export const calculateMeasureIndex = (absoluteTick) =>
  Math.floor(absoluteTick / getStepsPerPattern());

/**
 * Вычисляет индекс шага внутри паттерна на основе абсолютного тика
 */
export const calculateStepIndexInMeasure = (absoluteTick) =>
  absoluteTick % getStepsPerPattern();

/**
 * Рассчитывает сквозной абсолютный тик по координатам долей и микрошагов
 */
export const calculateAbsoluteTick = (measureIndex, beats, sixteenths) => {
  const stepInPattern = beats * SIXTEENTH_STEPS_PER_BEAT + sixteenths;
  return measureIndex * getStepsPerPattern() + stepInPattern;
};

/**
 * Парсит трекерную строку формата 'такт:доля:микрошаг' в сквозной абсолютный тик
 */
export const parseSynthTimeToAbsoluteTick = (timeStr, measureIndex) => {
  const timeCoordinates = timeStr.split(':');

  if (timeCoordinates.length !== VALID_TIME_COORDINATES_COUNT) {
    return measureIndex * getStepsPerPattern();
  }

  const beats = parseInt(timeCoordinates[1], 10) || 0;
  const sixteenths = parseInt(timeCoordinates[2], 10) || 0;

  return calculateAbsoluteTick(measureIndex, beats, sixteenths);
};

export const microTimingOffset = (drumIndex) => {
  const DRUM_PHASE_OFFSET = 0.001;
  return drumIndex * DRUM_PHASE_OFFSET;
};

export const parseToneTimeStringToSeconds = (timeStr, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();

  const parts = timeStr.split(':');
  if (parts.length !== 3) return 0;

  const measures = parseInt(parts[0], 10) || 0;
  const beats = parseInt(parts[1], 10) || 0;
  const sixteenths = parseInt(parts[2], 10) || 0;

  const secondsPerBeat = 60 / activeBpm;
  const secondsPerMeasure = secondsPerBeat * 4;
  const secondsPerStep = secondsPerBeat / 4;

  return (
    measures * secondsPerMeasure +
    beats * secondsPerBeat +
    sixteenths * secondsPerStep
  );
};

export const calculateAbsoluteTime = (time, measureIndex, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();

  const secondsPerBeat = 60 / activeBpm;
  const secondsPerMeasure = secondsPerBeat * 4;

  const stepSeconds =
    typeof time === 'string'
      ? parseToneTimeStringToSeconds(time, activeBpm)
      : time;
  const measureSeconds = measureIndex * secondsPerMeasure;

  return stepSeconds + measureSeconds;
};

export const compensateLatency = (plannedTime) => {
  const SCHEDULING_LOOKAHEAD_SEC = 0.01;
  const ctx = getNativeContext();
  return Math.max(plannedTime, ctx.currentTime + SCHEDULING_LOOKAHEAD_SEC);
};

export const getTotalSteps = (patterns, stepsPerMeasure = 16) => {
  const patternsCount = patterns?.length || 1;
  return patternsCount * stepsPerMeasure;
};

export const calculateCurrentStep = (timeSeconds, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();

  const secondsPerBeat = 60 / activeBpm;
  const secondsPerStep = secondsPerBeat / 4;

  return Math.floor(timeSeconds / secondsPerStep);
};

export const calculateCurrentPlayPattern = (step, stepsInMeasure) => {
  return Math.floor(step / stepsInMeasure);
};

// 🔥 ТОТ САМЫЙ ВОЗВРАЩЕННЫЙ ЭКСПОРТ ДЛЯ БАЙПАСОВ ЭФФЕКТОВ:
// Теперь audioModulationActions.js найдет его и успешно соберется!
export const checkBypassCondition = (liveValue, bypassValue) => {
  const targetBypassValue = typeof bypassValue === 'number' ? bypassValue : 0;
  return liveValue === targetBypassValue;
};
