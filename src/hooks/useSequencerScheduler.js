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
  updateHardwarePatternBounds,
  updateHardwareLoopState,
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

  // На границе такта (15-й шаг) обрабатываем только отложенные изменения структуры из UI
  if (stepInPattern === 15) {
    const pendingPattern = pendingPatternRef.current;
    const shouldDeleteLast = pendingDeleteLastRef.current;

    // 1. Квантованное удаление паттерна с конца
    if (shouldDeleteLast) {
      scheduleFrame(time, () => {
        const lastIndex = totalPatternsCount - 1;
        dispatch(backupAndDropPatternData(lastIndex));
        dispatch(decrementPatternCountSync());
        dispatch(clearPendingDeleteLastPattern());
      });
    }

    // 2. Ручной принудительный прыжок на другой паттерн по клику пользователя (Кнопка PLAY)
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

  // НЕПРЕРЫВНЫЙ И НАДЕЖНЫЙ ОБНОВИТЕЛЬ ИНТЕРФЕЙСА: Передаем точный шаг и паттерн в Redux
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

  // ЖЕЛЕЗНЫЙ МОСТ: Каждую миллисекунду транслируем живое состояние кнопок лупа UI в буфер аудио-ядра
  useEffect(() => {
    updateHardwareLoopState(
      isLooping,
      selectedPatternIndex,
      currentPlayPatternIndex,
    );
  }, [isLooping, selectedPatternIndex, currentPlayPatternIndex]);

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

  // Конвейер планировщика кадров
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
  }, [sequencerPlayState, dispatch]); // Убрали лишние зависимости, заставлявшие хук паниковать на старте
};
