import {
  getStepsPerPattern,
  parseSynthTimeToAbsoluteTick,
} from '../../../utils/audioMathUtils';
import {
  calculateAbsoluteStepTick,
  calculateDrumPhaseOffset,
  appendNoteToTimeline,
} from './audioTrackTimeline';

const ACTIVE_HIT_MARKER = 1;

const isStepInactive = (hitValue) => hitValue !== ACTIVE_HIT_MARKER;
const isNoteMissing = (item) => !item || !item.note;
const isGridInvalid = (grid) => !Array.isArray(grid);

/**
 * Линейный плоский цикл по нотам одного конкретного такта синтезатора
 */
export const processMeasureSynthGroup = (
  patternsMap,
  patternGrid,
  measureIndex,
) => {
  if (isGridInvalid(patternGrid)) return;

  for (const item of patternGrid) {
    if (!isNoteMissing(item)) {
      const absoluteTick = parseSynthTimeToAbsoluteTick(
        item.time,
        measureIndex,
      );
      appendNoteToTimeline(patternsMap, absoluteTick, item);
    }
  }
};

/**
 * Высокопроизводительный линейный цикл по шагам одной дорожки барабана
 */
export const processSingleDrumTrackSteps = (
  patternsMap,
  trackSteps,
  measureIndex,
  drumIndex,
  note,
) => {
  const stepsPerPattern = getStepsPerPattern();
  const phaseOffset = calculateDrumPhaseOffset(drumIndex);
  let stepIndex = 0;

  for (const hitValue of trackSteps) {
    if (!isStepInactive(hitValue)) {
      const absoluteTick = calculateAbsoluteStepTick(
        measureIndex,
        stepsPerPattern,
        stepIndex,
      );
      appendNoteToTimeline(
        patternsMap,
        absoluteTick,
        { note, drumIndex },
        phaseOffset,
      );
    }
    stepIndex++;
  }
};

/**
 * Линейный плоский перебор инструментов внутри одного текущего такта барабанов
 */
export const processMeasureDrumsGroup = (
  patternsMap,
  drumsInMeasure,
  measureIndex,
  drumNoteMap,
) => {
  const drumEntries = Object.entries(drumsInMeasure);
  let drumIndex = 0;

  for (const [drumName, trackSteps] of drumEntries) {
    const note = drumNoteMap[drumName];

    if (isNoteMissing({ note }) || isGridInvalid(trackSteps)) {
      drumIndex++;
      continue;
    }

    processSingleDrumTrackSteps(
      patternsMap,
      trackSteps,
      measureIndex,
      drumIndex,
      note,
    );
    drumIndex++;
  }
};
