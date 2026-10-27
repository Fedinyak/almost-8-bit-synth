import { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STEP_DURATION_NOTATION } from '../constants/constants';
import { startDrawingLoop, stopDrawingLoop } from '../audio/timeline/draw';
import {
  updateHardwareLoopState,
  updateHardwarePatternBounds,
} from '../audio/timeline/scheduler';
import {
  isHardwareStateUnchanged,
  handleStepSync,
} from '../audio/timeline/schedulerUtils';
import { PLAYBACK_STATES } from '../constants/audioEngineConfig';

// --- САМОДОКУМЕНТИРОВАННЫЕ FP ПРЕДИКАТЫ ---
const isPlaying = (state) => state === PLAYBACK_STATES.START;

// --- СЛУЖЕБНЫЕ МЕТОДЫ СБОРКИ ДАННЫХ ДЛЯ СНИЖЕНИЯ НАГРУЗКИ ---

const calculateEffectiveLoopTarget = (
  isLooping,
  currentPlayIndex,
  selectedIndex,
) => {
  return isLooping ? currentPlayIndex : selectedIndex;
};

const captureHardwareState = (
  isLooping,
  effectiveLoopTarget,
  currentPlayPatternIndex,
  pendingPatternIndex,
) => {
  return {
    isLooping,
    effectiveLoopTarget,
    currentPlayPatternIndex,
    pendingPatternIndex,
  };
};

const commitCacheValues = (cache, state) => {
  cache.isLooping.current = state.isLooping;
  cache.loopTarget.current = state.effectiveLoopTarget;
  cache.playbackIndex.current = state.currentPlayPatternIndex;
  cache.pendingIndex.current = state.pendingPatternIndex;
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

  const hardwareCache = useMemo(
    () => ({
      isLooping: lastSentIsLooping,
      loopTarget: lastSentLoopTarget,
      playbackIndex: lastSentPlaybackIndex,
      pendingIndex: lastSentPendingIndex,
    }),
    [],
  );

  // ОПТИМИЗИРОВАННЫЙ МОСТ: Оставляем все оригинальные реактивные зависимости,
  // но блокируем холостые вызовы аудио-ядра с помощью быстрых сравнений в кэш-затворе.
  useEffect(() => {
    const effectiveLoopTarget = calculateEffectiveLoopTarget(
      isLooping,
      currentPlayPatternIndex,
      selectedPatternIndex,
    );

    const currentHardwareState = captureHardwareState(
      isLooping,
      effectiveLoopTarget,
      currentPlayPatternIndex,
      pendingPatternIndex,
    );

    // Проверяем: изменилось ли хоть что-то с момента последнего тика?
    if (isHardwareStateUnchanged(hardwareCache, currentHardwareState)) {
      // Если стейт идентичен (холостой ход бегущего плейхеда),
      // мы мгновенно выходим и не нагружаем аудио-поток лишней работой!
      return;
    }

    // Запоминаем новые отправленные значения
    commitCacheValues(hardwareCache, currentHardwareState);

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
    hardwareCache,
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
    if (!isPlaying(sequencerPlayState)) return;

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
