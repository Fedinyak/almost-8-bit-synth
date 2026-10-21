import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';

// --- ЧИСТЫЕ ДОМЕННЫЕ ВЫЧИСЛЕНИЯ (МАТЕМАТИКА СЕКВЕНСОРА) ---

const getStepsPerPattern = () => SEQUENCER_CONFIG.SEQUENCER_STEP;

const calculateMeasureIndex = (absoluteTick) =>
  Math.floor(absoluteTick / getStepsPerPattern());

const calculateStepIndexInMeasure = (absoluteTick) =>
  absoluteTick % getStepsPerPattern();

const parseFirstTimeCoordinate = (timeValue) => {
  const timeCoordinates = timeValue.split(':');
  const baseRadix = 10;
  return parseInt(timeCoordinates, baseRadix) || 0;
};

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ (ПРОВЕРКИ СОСТОЯНИЯ) ---

const isInvalidTimeFormat = (timeValue) => {
  const expectedPartsCount = 3;
  return timeValue.split(':').length !== expectedPartsCount;
};

const isMeasureEmpty = (patternsMap, measureIndex) =>
  !patternsMap[measureIndex];

const isStepEmpty = (patternsMap, measureIndex, stepIndex) =>
  !patternsMap[measureIndex][stepIndex];

// --- АБСТРАКЦИИ РАБОТЫ СО СТРУКТУРОЙ ДАННЫХ ---

const initializeMeasureStructure = (patternsMap, measureIndex) => {
  if (isMeasureEmpty(patternsMap, measureIndex)) {
    patternsMap[measureIndex] = {};
  }
};

const initializeStepStructure = (patternsMap, measureIndex, stepIndex) => {
  if (isStepEmpty(patternsMap, measureIndex, stepIndex)) {
    patternsMap[measureIndex][stepIndex] = [];
  }
};

const createStepEventContainer = (patternsMap, measureIndex, stepIndex) => {
  initializeMeasureStructure(patternsMap, measureIndex);
  initializeStepStructure(patternsMap, measureIndex, stepIndex);
};

const pushEventToMap = (patternsMap, measureIndex, stepIndex, eventData) => {
  createStepEventContainer(patternsMap, measureIndex, stepIndex);
  patternsMap[measureIndex][stepIndex].push(eventData);
};

const getEventCellData = (patternsMap, measureIndex, stepIndex) => {
  if (isMeasureEmpty(patternsMap, measureIndex)) return null;
  return patternsMap[measureIndex][stepIndex] || null;
};

// --- ВЫСОКОПРОИЗВОДИТЕЛЬНЫЕ СИСТЕМНЫЕ ИТЕНРАТОРЫ (DSP ZONE) ---

const executeStepActions = (cellData, exactAudioTime, onStepAction) => {
  if (Array.isArray(cellData)) {
    const cellSize = cellData.length;
    for (let i = 0; i < cellSize; i++) {
      const noteCell = cellData[i];
      onStepAction(exactAudioTime + noteCell.phaseOffset, noteCell.data);
    }
  } else {
    onStepAction(exactAudioTime + cellData.phaseOffset, cellData.data);
  }
};

// --- ФАБРИКА ДОРОЖКИ ВОСПРОИЗВЕДЕНИЯ ---

export function PlaybackTrack(onStepAction) {
  const track = {
    patternsMap: {},

    clear() {
      track.patternsMap = {};
    },

    add(musicalTimeValue, measureIndex, noteData, phaseOffset = 0) {
      if (isInvalidTimeFormat(musicalTimeValue)) return;

      const stepIndexInMeasure = parseFirstTimeCoordinate(musicalTimeValue);
      const eventPayload = { data: noteData, phaseOffset };

      pushEventToMap(
        track.patternsMap,
        measureIndex,
        stepIndexInMeasure,
        eventPayload,
      );
    },

    addNoteToTick(absoluteTick, noteData, phaseOffset = 0) {
      const measureIndex = calculateMeasureIndex(absoluteTick);
      const stepIndexInMeasure = calculateStepIndexInMeasure(absoluteTick);
      const eventPayload = { data: noteData, phaseOffset };

      pushEventToMap(
        track.patternsMap,
        measureIndex,
        stepIndexInMeasure,
        eventPayload,
      );
    },

    setLoopDuration(numberOfMeasures) {},
    applyHardwareLoopEnd(count) {},

    processAudioStep(
      exactAudioTime,
      stepIndexInPattern,
      currentHardwarePattern,
    ) {
      const cellData = getEventCellData(
        track.patternsMap,
        currentHardwarePattern,
        stepIndexInPattern,
      );
      if (!cellData) return;

      executeStepActions(cellData, exactAudioTime, onStepAction);
    },

    processSchedule() {},

    dispose() {
      track.patternsMap = {};
    },
  };

  return track;
}
