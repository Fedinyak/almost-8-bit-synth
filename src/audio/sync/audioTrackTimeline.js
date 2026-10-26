import {
  calculateMeasureIndex,
  calculateStepIndexInMeasure,
} from '../../utils/audioMathUtils';

const DRUM_PHASE_OFFSET_STEP = 0.001;

export const calculateAbsoluteStepTick = (
  measureIndex,
  stepsPerPattern,
  stepIndex,
) => measureIndex * stepsPerPattern + stepIndex;

export const calculateDrumPhaseOffset = (drumIndex) =>
  drumIndex * DRUM_PHASE_OFFSET_STEP;

const ensureStepStructure = (patternsMap, measureIndex, stepIndex) => {
  if (!patternsMap[measureIndex]) {
    patternsMap[measureIndex] = {};
  }
  if (!patternsMap[measureIndex][stepIndex]) {
    patternsMap[measureIndex][stepIndex] = [];
  }
};

export const appendNoteToTimeline = (
  patternsMap,
  absoluteTick,
  noteData,
  phaseOffset,
) => {
  const measureIndex = calculateMeasureIndex(absoluteTick);
  const stepIndexInMeasure = calculateStepIndexInMeasure(absoluteTick);
  const eventPayload = { data: noteData, phaseOffset };

  ensureStepStructure(patternsMap, measureIndex, stepIndexInMeasure);
  patternsMap[measureIndex][stepIndexInMeasure].push(eventPayload);
};
