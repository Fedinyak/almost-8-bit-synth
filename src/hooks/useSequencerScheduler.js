import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPendingPattern,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  decrementPatternCountSync,
  clearPendingDeleteLastPattern,
} from '../store/playerSlice';
import { backupAndDropPatternData } from '../store/patternsSlice';
import {
  STEPS_IN_MEASURE,
  STEP_DURATION_NOTATION,
} from '../constants/constants';
import {
  scheduleFrame,
  startDrawingLoop,
  stopDrawingLoop,
} from '../audio/core/draw';
import {
  updateHardwareLoopState,
  updateHardwarePatternBounds,
} from '../audio/core/scheduler';

const handleStepSync = (
  time,
  stepInPattern,
  currentHardwarePattern,
  pendingPatternRef,
  dispatch,
  pendingDeleteLastRef,
  patternCountRef,
) => {
  const totalPatternsCount = patternCountRef.current || 1;
  let nextPlayPatternIndex = currentHardwarePattern;

  if (stepInPattern === 15) {
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

    if (pendingPattern !== null) {
      nextPlayPatternIndex = pendingPattern;
      scheduleFrame(time, () => {
        dispatch(setCurrentPlayPatternIndex(nextPlayPatternIndex));
        dispatch(setCurrentStep(nextPlayPatternIndex * STEPS_IN_MEASURE));
        dispatch(clearPendingPattern());
      });
      return;
    }
  }

  scheduleFrame(time, () => {
    const targetGlobalStep =
      nextPlayPatternIndex * STEPS_IN_MEASURE + stepInPattern;
    dispatch(setCurrentStep(targetGlobalStep));
    dispatch(setCurrentPlayPatternIndex(nextPlayPatternIndex));
  });
};

export const useSequencerScheduler = () => {
  const dispatch = useDispatch();

  const pendingPatternIndex = useSelector(
    (state) => state.player.pendingPatternIndex,
  );
  const isLooping = useSelector((state) => state.player.isLooping);
  const pendingDeleteLast = useSelector(
    (state) => state.player.pendingDeleteLast,
  );
  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );
  const patternCount = useSelector((state) => state.player.patternCount);
  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );
  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );

  const pendingPatternRef = useRef(null);
  const pendingDeleteLastRef = useRef(pendingDeleteLast);
  const patternCountRef = useRef(patternCount);

  // КЭШ-ЗАТВОРЫ ДЛЯ ОПТИМИЗАЦИИ МОБИЛЬНЫХ УСТРОЙСТВ:
  // Хранят последнее физически отправленное состояние в аудио-движок
  const lastSentIsLooping = useRef(null);
  const lastSentLoopTarget = useRef(null);
  const lastSentPlaybackIndex = useRef(null);
  const lastSentPendingIndex = useRef(null);

  // ОПТИМИЗИРОВАННЫЙ МОСТ: Оставляем все оригинальные реактивные зависимости,
  // но блокируем холостые вызовы аудио-ядра с помощью быстрых сравнений в кэш-затворе.
  useEffect(() => {
    const effectiveLoopTarget = isLooping
      ? currentPlayPatternIndex
      : selectedPatternIndex;

    // Проверяем: изменилось ли хоть что-то с момента последнего тика?
    if (
      lastSentIsLooping.current === isLooping &&
      lastSentLoopTarget.current === effectiveLoopTarget &&
      lastSentPlaybackIndex.current === currentPlayPatternIndex &&
      lastSentPendingIndex.current === pendingPatternIndex
    ) {
      // Если стейт идентичен (холостой ход бегущего плейхеда),
      // мы мгновенно выходим и не нагружаем аудио-поток лишней работой!
      return;
    }

    // Запоминаем новые отправленные значения
    lastSentIsLooping.current = isLooping;
    lastSentLoopTarget.current = effectiveLoopTarget;
    lastSentPlaybackIndex.current = currentPlayPatternIndex;
    lastSentPendingIndex.current = pendingPatternIndex;

    // Физический выстрел в аудио-движок происходит ТОЛЬКО при реальных изменениях
    updateHardwareLoopState(
      isLooping,
      effectiveLoopTarget,
      currentPlayPatternIndex,
      pendingPatternIndex,
    );
  }, [
    isLooping,
    selectedPatternIndex,
    currentPlayPatternIndex,
    pendingPatternIndex,
  ]);

  useEffect(() => {
    updateHardwarePatternBounds(patternCount);
    patternCountRef.current = patternCount;
  }, [patternCount]);

  useEffect(() => {
    pendingPatternRef.current = pendingPatternIndex;
  }, [pendingPatternIndex]);

  useEffect(() => {
    pendingDeleteLastRef.current = pendingDeleteLast;
  }, [pendingDeleteLast]);

  useEffect(() => {
    if (sequencerPlayState !== 'start') return;

    const drawingProcess = startDrawingLoop(
      (time, hardwareStep, hardwarePattern) =>
        handleStepSync(
          time,
          hardwareStep,
          hardwarePattern,
          pendingPatternRef,
          dispatch,
          pendingDeleteLastRef,
          patternCountRef,
        ),
      STEP_DURATION_NOTATION,
    );

    return () => stopDrawingLoop(drawingProcess);
  }, [sequencerPlayState, dispatch]);
};
