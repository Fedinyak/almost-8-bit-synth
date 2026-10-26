import { musicalTime } from './musicalTime';
import { backupAndDropPatternData } from '../../store/patternsSlice';
import {
  clearPendingPattern,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  decrementPatternCountSync,
  clearPendingDeleteLastPattern,
} from '../../store/playerSlice';
import { STEPS_IN_MEASURE } from '../../constants/constants';
import { scheduleFrame } from './draw';

const EMPTY_ARRAY_LENGTH = 0;
const LAST_STEP_INDEX = 15;

// Проверка: пустой ли массив нот у дорожки
export const isTrackNotesEmpty = (notes) => notes.length === EMPTY_ARRAY_LENGTH;

// Проверка: должна ли конкретная нота прозвучать в текущем окне планировщика
export const shouldNoteBeScheduled = (
  note,
  track,
  currentTransportTime,
  endTransportTime,
) => {
  const projectedTime = musicalTime.calculateProjectedTime(
    note.time,
    currentTransportTime,
    track.loopEnd,
  );
  return musicalTime.isNoteInSchedulingWindow(
    projectedTime,
    track.lastScheduledTime,
    endTransportTime,
  );
};

// Воспроизведение ноты с вычислением точного нативного времени аудио-контекста
export const triggerAudioEvent = (
  note,
  track,
  onStepAction,
  currentTransportTime,
  currentContextTime,
) => {
  const projectedTime = musicalTime.calculateProjectedTime(
    note.time,
    currentTransportTime,
    track.loopEnd,
  );
  const exactAudioTime = musicalTime.calculateExactAudioTime(
    projectedTime,
    currentTransportTime,
    currentContextTime,
  );

  onStepAction(exactAudioTime, note.data);
};

// Фиксация крайней временной отметки, до которой планировщик уже обработал ноты
export const commitLastScheduledTime = (track, endTransportTime) => {
  track.lastScheduledTime = endTransportTime;
};

// --- ДЕКЛАРАТИВНЫЕ FP ПРЕДИКАТЫ ДЛЯ ЖЕЛЕЗНОГО ШЕДУЛЕРА ---

export const isLastStepOfPattern = (step) => step === LAST_STEP_INDEX;
export const hasPendingPattern = (patternIndex) => patternIndex !== null;

export const isHardwareStateUnchanged = (cache, current) => {
  return (
    cache.isLooping.current === current.isLooping &&
    cache.loopTarget.current === current.effectiveLoopTarget &&
    cache.playbackIndex.current === current.currentPlayPatternIndex &&
    cache.pendingIndex.current === current.pendingPatternIndex
  );
};

// --- ДЕКЛАРАТИВНЫЕ МЕТОДЫ СИНХРОНИЗАЦИИ ---

const executeLastStepActions = (
  time,
  pendingPatternRef,
  pendingDeleteLastRef,
  patternCountRef,
  dispatch,
  nextPlayPatternIndexRef,
) => {
  const totalPatternsCount = patternCountRef.current || 1;
  const pendingPattern = pendingPatternRef.current;
  const shouldDeleteLast = pendingDeleteLastRef.current;

  if (shouldDeleteLast) {
    scheduleFrame(time, () => {
      const lastIndex = totalPatternsCount - 1;
      dispatch(backupAndDropPatternData(lastIndex));
      dispatch(decrementPatternCountSync());
      dispatch(clearPendingDeleteLastPattern());
    });
  }

  if (hasPendingPattern(pendingPattern)) {
    nextPlayPatternIndexRef.current = pendingPattern;
    scheduleFrame(time, () => {
      dispatch(setCurrentPlayPatternIndex(pendingPattern));
      dispatch(setCurrentStep(pendingPattern * STEPS_IN_MEASURE));
      dispatch(clearPendingPattern());
    });
    return true;
  }

  return false;
};

export const handleStepSync = (
  time,
  stepInPattern,
  currentHardwarePattern,
  pendingPatternRef,
  dispatch,
  pendingDeleteLastRef,
  patternCountRef,
) => {
  const nextPlayPatternIndexRef = { current: currentHardwarePattern };

  if (isLastStepOfPattern(stepInPattern)) {
    const isInterruptedByPending = executeLastStepActions(
      time,
      pendingPatternRef,
      pendingDeleteLastRef,
      patternCountRef,
      dispatch,
      nextPlayPatternIndexRef,
    );

    if (isInterruptedByPending) return;
  }

  scheduleFrame(time, () => {
    const targetGlobalStep =
      nextPlayPatternIndexRef.current * STEPS_IN_MEASURE + stepInPattern;
    dispatch(setCurrentStep(targetGlobalStep));
    dispatch(setCurrentPlayPatternIndex(nextPlayPatternIndexRef.current));
  });
};
