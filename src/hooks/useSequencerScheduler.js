import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPendingPattern,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  decrementPatternCountSync,
  clearPendingDeleteLastPattern,
} from '../slices/playerSlice';
import { backupAndDropPatternData } from '../slices/patternsSlice';
import {
  STEPS_IN_MEASURE,
  STEP_DURATION_NOTATION,
} from '../constants/constants';
import {
  calculateCurrentPlayPattern,
  calculateCurrentStep,
} from '../utility/audioMathUtils';
import {
  disableEngineLoop,
  enableEngineLoop,
  enableGlobalTransportLoop, // Импортируем управление глобальным лупом
  scheduleFrame,
  setEnginePosition,
  startDrawingLoop,
  stopDrawingLoop,
} from '../utility/audioEngineCore';

const handleStepSync = (
  time,
  pendingPatternRef,
  isPatternLoopRef,
  dispatch,
  pendingDeleteLastRef,
  currentPlayPatternIndexRef,
  patternCountRef,
) => {
  // ИСПРАВЛЕНО: Считаем чистый шаг без деления по модулю через totalSteps
  const absoluteStep = calculateCurrentStep(time);
  const currentPlayPattern = calculateCurrentPlayPattern(
    absoluteStep,
    STEPS_IN_MEASURE,
  );
  const stepInPattern = absoluteStep % STEPS_IN_MEASURE;

  // Динамически удерживаем рамки Tone.Transport под актуальную длину трека, если не включен соло-луп паттерна
  if (!isPatternLoopRef.current) {
    enableGlobalTransportLoop(patternCountRef.current);
  }

  if (stepInPattern === 15) {
    const nextPattern = pendingPatternRef.current;
    const isLoopActive = isPatternLoopRef.current;
    const shouldDeleteLast = pendingDeleteLastRef.current;

    if (shouldDeleteLast) {
      const activeIndex = currentPlayPatternIndexRef.current;
      const totalCount = patternCountRef.current;
      const lastIndex = totalCount - 1;

      if (activeIndex === lastIndex || isLoopActive) {
        scheduleFrame(time, () => {
          dispatch(backupAndDropPatternData(lastIndex));
          dispatch(decrementPatternCountSync());
          dispatch(clearPendingDeleteLastPattern());
        });
      }
    }

    if (nextPattern !== null) {
      disableEngineLoop();
      setEnginePosition(nextPattern);

      scheduleFrame(time, () => {
        dispatch(setCurrentPlayPatternIndex(nextPattern));
        dispatch(setCurrentStep(nextPattern * STEPS_IN_MEASURE));
        dispatch(clearPendingPattern());
      });
      return;
    }

    if (isLoopActive) {
      enableEngineLoop(currentPlayPattern);

      scheduleFrame(time, () => {
        dispatch(setCurrentStep(absoluteStep));
      });
      return;
    }
  }

  scheduleFrame(time, () => {
    dispatch(setCurrentStep(absoluteStep));
    dispatch(setCurrentPlayPatternIndex(currentPlayPattern));
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

  const pendingPatternRef = useRef(null);
  const isPatternLoopRef = useRef(null);

  const pendingDeleteLastRef = useRef(pendingDeleteLast);
  const currentPlayPatternIndexRef = useRef(currentPlayPatternIndex);
  const patternCountRef = useRef(patternCount);

  // Принудительно задаем изначальный размер лупа трека при старте хука
  useEffect(() => {
    if (!isLooping) {
      enableGlobalTransportLoop(patternCount);
    }
  }, [patternCount, isLooping]);

  useEffect(() => {
    pendingPatternRef.current = pendingPatternIndex;
  }, [pendingPatternIndex]);

  useEffect(() => {
    isPatternLoopRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    pendingDeleteLastRef.current = pendingDeleteLast;
  }, [pendingDeleteLast]);

  useEffect(() => {
    currentPlayPatternIndexRef.current = currentPlayPatternIndex;
  }, [currentPlayPatternIndex]);

  useEffect(() => {
    patternCountRef.current = patternCount;
  }, [patternCount]);

  useEffect(() => {
    const drawingProcess = startDrawingLoop(
      (time) =>
        handleStepSync(
          time,
          pendingPatternRef,
          isPatternLoopRef,
          dispatch,
          pendingDeleteLastRef,
          currentPlayPatternIndexRef,
          patternCountRef,
        ),
      STEP_DURATION_NOTATION,
    );

    return () => stopDrawingLoop(drawingProcess);
  }, [dispatch]);
};
