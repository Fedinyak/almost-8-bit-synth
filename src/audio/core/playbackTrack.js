import {
  calculateMeasureIndex,
  calculateStepIndexInMeasure,
} from '../../utils/audioMathUtils';
import { writeEventToMatrix, readEventFromMatrix } from './playbackTrackModel';

// --- ВЫСОКОПРОИЗВОДИТЕЛЬНЫЕ СИСТЕМНЫЕ ИТЕРАТОРЫ (DSP ZONE) ---

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

/**
 * Фабрика дорожки воспроизведения конкретного инструмента.
 * Чистый декларативный фасад, полностью изолированный от низкоуровневых операций над объектами памяти.
 */
export function PlaybackTrack(onStepAction) {
  const track = {
    patternsMap: {},

    clear() {
      track.patternsMap = {};
    },

    addNoteToTick(absoluteTick, noteData, phaseOffset = 0) {
      const measureIndex = calculateMeasureIndex(absoluteTick);
      const stepIndexInMeasure = calculateStepIndexInMeasure(absoluteTick);
      const eventPayload = { data: noteData, phaseOffset };

      writeEventToMatrix(
        track.patternsMap,
        measureIndex,
        stepIndexInMeasure,
        eventPayload,
      );
    },

    processAudioStep(
      exactAudioTime,
      stepIndexInPattern,
      currentHardwarePattern,
    ) {
      const cellData = readEventFromMatrix(
        track.patternsMap,
        currentHardwarePattern,
        stepIndexInPattern,
      );
      if (!cellData) return;

      executeStepActions(cellData, exactAudioTime, onStepAction);
    },

    setLoopDuration(_numberOfMeasures) {},
    applyHardwareLoopEnd(_count) {},
    processSchedule() {},

    dispose() {
      track.patternsMap = {};
    },
  };

  return track;
}
