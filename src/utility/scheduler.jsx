import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPendingPattern,
  setCurrentPlayPatternIndex,
  setCurrentStep,
} from '../slices/sequencerSlice';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import {
  STEPS_IN_MEASURE,
  DEFAULT_DRUM_RELEASE,
  STEP_DURATION_NOTATION,
  SYNTH_LIST,
} from '../constants/constants';
import {
  calculateCurrentPlayPattern,
  calculateCurrentStep,
  getTotalSteps,
} from './audioMathUtils';
import {
  disableEngineLoop,
  enableEngineLoop,
  // scheduleEngineJump,
  scheduleFrame,
  setEngineBpm,
  setEnginePosition,
  // scheduleEngineJump,
  setPlayState,
  startDrawingLoop,
  stopDrawingLoop,
} from './audioEngineCore';
import {
  initializeDrums,
  initializeSynths,
  setupDrumsPlayback,
  setupSynthPlayback,
  stopAllAudio,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from './audioEngineActions';

const drumNoteMap = noteAndKeyMap.drumNoteMap;
const handleStepSync = (
  time,
  totalSteps,
  pendingPatternRef,
  isPatternLoopRef,
  dispatch,
) => {
  const currentStep = calculateCurrentStep(time, totalSteps);
  const currentPlayPattern = calculateCurrentPlayPattern(
    currentStep,
    STEPS_IN_MEASURE,
  );
  const stepInPattern = currentStep % STEPS_IN_MEASURE;

  // ЛОВИМ 15-Й ШАГ (стык тактов)
  if (stepInPattern === 15) {
    const nextPattern = pendingPatternRef.current;
    const isLoopActive = isPatternLoopRef.current;

    // Сценарий 1: Юзер принудительно выбрал другой паттерн для врыва (Приоритет)
    if (nextPattern !== null) {
      disableEngineLoop(); // Выключаем луп, если он был включен
      setEnginePosition(nextPattern); // Перематываем иглу на новый паттерн

      scheduleFrame(time, () => {
        dispatch(setCurrentPlayPatternIndex(nextPattern));
        dispatch(setCurrentStep(nextPattern * STEPS_IN_MEASURE));
        dispatch(clearPendingPattern());
      });
      return;
    }

    // Сценарий 2: Ворваться никто не просил, но юзер включил кнопку ЛУП на текущем паттерне!
    if (isLoopActive) {
      // Заставляем Tone.Transport зациклить текущий такт нативными средствами!
      enableEngineLoop(currentPlayPattern);

      scheduleFrame(time, () => {
        // Мы НЕ мутируем позицию! Поезд времени крутится внутри нативного лупа Tone.js.
        // Мы просто держим визуальный шаг в рамках текущего паттерна (например, 16-31)
        dispatch(setCurrentStep(currentStep));
      });
      return;
    } else {
      // Если луп БЫЛ активен, но юзер его ОТЖАЛ — размыкаем петлю, едем по колбасе дальше
      disableEngineLoop();
    }
  }

  // Обычный ход времени по длинной колбасе (если нет врыва и нет лупа)
  scheduleFrame(time, () => {
    dispatch(setCurrentStep(currentStep));
    dispatch(setCurrentPlayPatternIndex(currentPlayPattern));
  });
};

const TimerTransport = () => {
  const dispatch = useDispatch();

  const pendingPatternIndex = useSelector(
    (state) => state.sequencer.pendingPatternIndex,
  );
  const isLooping = useSelector((state) => state.sequencer.isLooping);

  const synthData = useSelector((state) => state.sequencer.synthData);
  // const SYNTH_LIST = useSelector((state) => state.sequencer.SYNTH_LIST);
  const drumsList = useSelector((state) => state.sequencer.drumsData);
  const bpm = useSelector((state) => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    (state) => state.sequencer.sequencerPlayState,
  );

  const totalSteps = getTotalSteps(drumsList?.patterns, STEPS_IN_MEASURE);

  const synthEnginesRef = useRef({});
  const synthPartRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);
  const pendingPatternRef = useRef(null);
  const isPatternLoopRef = useRef(null);

  useEffect(() => {
    pendingPatternRef.current = pendingPatternIndex;
  }, [pendingPatternIndex]);

  useEffect(() => {
    isPatternLoopRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);
  }, []);

  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      setupSynthPlayback(name, synthEnginesRef.current, synthPartRef.current);
    });

    setupDrumsPlayback(
      drumsEngineRef,
      drumsPartRef,
      drumNoteMap,
      DEFAULT_DRUM_RELEASE,
    );

    return () =>
      stopAllAudio({
        synths: synthEnginesRef,
        parts: synthPartRef,
        drumsEngine: drumsEngineRef,
        drumsPart: drumsPartRef,
      });
  }, []);
  // }, [SYNTH_LIST]);

  useEffect(() => {
    SYNTH_LIST.forEach((synthName) => {
      syncInstrumentPatternsToTrack(
        synthPartRef.current[synthName],
        synthData[synthName],
      );
    });

    syncDrumPatternsToTrack(drumsPartRef.current, drumsList, drumNoteMap);
  }, [synthData, drumsList]);
  // }, [synthData, drumsList, SYNTH_LIST]);

  useEffect(() => {
    const drawingProcess = startDrawingLoop(
      (time) =>
        handleStepSync(
          time,
          totalSteps,
          pendingPatternRef,
          isPatternLoopRef,
          dispatch,
        ),
      STEP_DURATION_NOTATION,
    );

    return () => stopDrawingLoop(drawingProcess);
  }, [totalSteps, dispatch]);

  // Transport controller
  useEffect(() => {
    setPlayState(sequencerPlayState);
  }, [sequencerPlayState]);

  useEffect(() => {
    setEngineBpm(bpm);
  }, [bpm]);

  return null;
};

export default TimerTransport;
