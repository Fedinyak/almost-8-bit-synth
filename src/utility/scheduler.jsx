import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentStep } from '../slices/sequencerSlice';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import {
  STEPS_IN_MEASURE,
  DEFAULT_DRUM_RELEASE,
  STEP_DURATION_NOTATION,
  SYNTH_LIST,
} from '../constants/constants';
import { calculateCurrentStep, getTotalSteps } from './audioMathUtils';
import {
  scheduleFrame,
  setEngineBpm,
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

const handleStepSync = (time, totalSteps, dispatch) => {
  const currentStep = calculateCurrentStep(time, totalSteps);

  scheduleFrame(time, () => {
    dispatch(setCurrentStep(currentStep));
  });
};

const TimerTransport = () => {
  const dispatch = useDispatch();

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
      (time) => handleStepSync(time, totalSteps, dispatch),
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
