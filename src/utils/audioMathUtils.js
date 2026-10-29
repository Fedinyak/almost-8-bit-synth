import { getNativeContext } from '../audio/context/nativeContext';
// Живой нативный темп прямо из ядра
import { getCurrentEngineBpm } from '../audio/bridge/audioEngineCore';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';
import {
  INFRA_PARAM_MUTATION_EPSILON,
  INFRA_SCHEDULING_LOOKAHEAD_SEC,
  INFRA_DRUM_PHASE_OFFSET,
  TIME_VALID_COORDINATES_COUNT,
  TIME_BEATS_INDEX,
  TIME_SIXTEENTHS_INDEX,
  TIME_FALLBACK_SECONDS_VALUE,
  TIME_STRING_SPLIT_CHAR,
} from '../constants/audioEngineConfig';

const SIXTEENTH_STEPS_PER_BEAT = 4;
const SECONDS_IN_MINUTE = 60;

const DB_CONVERSION_BASE = 10;
const DB_CONVERSION_DIVISER = 20;
const CONTEXT_SUSPENDED_STATE = 'suspended';

// Профессиональный порог отсечки шумовой полки (Floor Threshold). Всё, что тише -60 дБ,
// физически превращается в честный цифровой ноль, предотвращая сифон и песок в эффектах.
const ABSOLUTE_SILENCE_THRESHOLD_DB = -59.9;
const LINEAR_ZERO_AMPLITUDE = 0.0;

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ ВРЕМЕНИ И ТАЙМЛАЙНА ---

const isLastStepOfPattern = (stepIndex) =>
  stepIndex === getStepsPerPattern() - 1;

const hasPendingJump = (jumpIndex) => jumpIndex !== null;

const isPatternOutOfBound = (patternIndex, maxCount) =>
  patternIndex >= maxCount;

const isCoordinateCountInvalid = (partsArray) =>
  partsArray.length !== TIME_VALID_COORDINATES_COUNT;

const isTimeString = (value) => typeof value === 'string';

// --- ЧИСТЫЕ МАТЕМАТИЧЕСКИЕ ПРЕОБРАЗОВАНИЯ ---

export const dbToLinearGain = (dbValue) => {
  if (dbValue <= ABSOLUTE_SILENCE_THRESHOLD_DB) {
    return LINEAR_ZERO_AMPLITUDE;
  }
  return Math.pow(DB_CONVERSION_BASE, dbValue / DB_CONVERSION_DIVISER);
};

export const linearGainToDb = (linearGain) =>
  linearGain > 0 ? DB_CONVERSION_DIVISER * Math.log10(linearGain) : -Infinity;

export const isParamChangeSignificant = (currentValue, targetValue) =>
  Math.abs(currentValue - targetValue) >= INFRA_PARAM_MUTATION_EPSILON;

export const getStepsPerPattern = () => SEQUENCER_CONFIG.SEQUENCER_STEP || 16;

export const calculateMeasureIndex = (absoluteTick) =>
  Math.floor(absoluteTick / getStepsPerPattern());

export const calculateStepIndexInMeasure = (absoluteTick) =>
  absoluteTick % getStepsPerPattern();

export const calculateAbsoluteTick = (measureIndex, beats, sixteenths) => {
  const stepInPattern = beats * SIXTEENTH_STEPS_PER_BEAT + sixteenths;
  return measureIndex * getStepsPerPattern() + stepInPattern;
};

// --- ТРЕКЕРНЫЙ МУЗЫКАЛЬНЫЙ ПАРСИНГ ---

const splitTimeCoordinates = (timeStr) => timeStr.split(TIME_STRING_SPLIT_CHAR);

const parseCoordinateValue = (coordinateStr) =>
  parseInt(coordinateStr, 10) || 0;

export const parseSynthTimeToAbsoluteTick = (timeStr, measureIndex) => {
  const timeCoordinates = splitTimeCoordinates(timeStr);

  if (isCoordinateCountInvalid(timeCoordinates)) {
    return measureIndex * getStepsPerPattern();
  }

  const beats = parseCoordinateValue(timeCoordinates[TIME_BEATS_INDEX]);
  const sixteenths = parseCoordinateValue(
    timeCoordinates[TIME_SIXTEENTHS_INDEX],
  );

  return calculateAbsoluteTick(measureIndex, beats, sixteenths);
};

// --- ЧИСТАЯ АБСТРАКЦИЯ КВАНТОВАНИЯ ПЛЕЙХЕЛА (Playhead State Machine) ---

export const calculateNextHardwareCoordinates = (currentState, config) => {
  const { currentStep, currentPattern } = currentState;
  const { isLooping, pendingJumpIndex, maxPatterns } = config;

  if (!isLastStepOfPattern(currentStep)) {
    return {
      nextStep: currentStep + 1,
      nextPattern: currentPattern,
      nextJumpIndex: pendingJumpIndex,
    };
  }

  const resetStep = 0;

  if (hasPendingJump(pendingJumpIndex)) {
    return {
      nextStep: resetStep,
      nextPattern: pendingJumpIndex,
      nextJumpIndex: isLooping ? pendingJumpIndex : null,
    };
  }

  if (isLooping) {
    return {
      nextStep: resetStep,
      nextPattern: currentPattern,
      nextJumpIndex: pendingJumpIndex,
    };
  }

  const nextPatternCandidate = currentPattern + 1;
  const finalPattern = isPatternOutOfBound(nextPatternCandidate, maxPatterns)
    ? 0
    : nextPatternCandidate;

  return {
    nextStep: resetStep,
    nextPattern: finalPattern,
    nextJumpIndex: pendingJumpIndex,
  };
};

// --- РАСЧЕТ ТАЙМИНГОВ СЕТКИ СЕКВЕНСОРА ---

export const microTimingOffset = (drumIndex) => {
  return drumIndex * INFRA_DRUM_PHASE_OFFSET;
};

export const parseToneTimeStringToSeconds = (timeStr, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();
  const parts = splitTimeCoordinates(timeStr);

  if (isCoordinateCountInvalid(parts)) return TIME_FALLBACK_SECONDS_VALUE;

  const measures = parseCoordinateValue(parts[0]);
  const beats = parseCoordinateValue(parts[TIME_BEATS_INDEX]);
  const sixteenths = parseCoordinateValue(parts[TIME_SIXTEENTHS_INDEX]);

  const secondsPerBeat = SECONDS_IN_MINUTE / activeBpm;
  const secondsPerMeasure = secondsPerBeat * SIXTEENTH_STEPS_PER_BEAT;
  const secondsPerStep = secondsPerBeat / SIXTEENTH_STEPS_PER_BEAT;

  return (
    measures * secondsPerMeasure +
    beats * secondsPerBeat +
    sixteenths * secondsPerStep
  );
};

export const calculateAbsoluteTime = (time, measureIndex, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();

  const secondsPerBeat = SECONDS_IN_MINUTE / activeBpm;
  const secondsPerMeasure = secondsPerBeat * SIXTEENTH_STEPS_PER_BEAT;

  const stepSeconds = isTimeString(time)
    ? parseToneTimeStringToSeconds(time, activeBpm)
    : time;
  const measureSeconds = measureIndex * secondsPerMeasure;

  return stepSeconds + measureSeconds;
};

export const compensateLatency = (plannedTime) => {
  const ctx = getNativeContext();
  return Math.max(
    plannedTime,
    ctx.currentTime + INFRA_SCHEDULING_LOOKAHEAD_SEC,
  );
};

export const getTotalSteps = (patterns, stepsPerMeasure = 16) => {
  const patternsCount = patterns?.length || 1;
  return patternsCount * stepsPerMeasure;
};

export const calculateCurrentStep = (timeSeconds, bpm) => {
  const activeBpm = bpm || getCurrentEngineBpm();

  const secondsPerBeat = SECONDS_IN_MINUTE / activeBpm;
  const secondsPerStep = secondsPerBeat / SIXTEENTH_STEPS_PER_BEAT;

  return Math.floor(timeSeconds / secondsPerStep);
};

export const calculateCurrentPlayPattern = (step, stepsInMeasure) => {
  return Math.floor(step / stepsInMeasure);
};

export const checkBypassCondition = (liveValue, bypassValue) => {
  const targetBypassValue = typeof bypassValue === 'number' ? bypassValue : 0;
  return liveValue === targetBypassValue;
};

// --- НА ТИВНЫЕ ОПЕРАЦИИ AUDIO CONTEXT ---

export const extractNativeAudioContext = (toneNode) => {
  return (
    toneNode.context?.rawContext || toneNode.context || window.audioContext
  );
};

export const ensureAudioContextIsActive = (ctx) => {
  if (ctx && ctx.state === CONTEXT_SUSPENDED_STATE) {
    ctx.resume().catch(() => {});
  }
};

export const calculateTimelineTimes = (ctx, requestedTime) => {
  const now = ctx.currentTime;
  if (typeof requestedTime === 'number' && requestedTime >= now) {
    return requestedTime;
  }
  return now;
};
