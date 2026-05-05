import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";
import noteAndKeyMap from "../constants.js/noteAndKeyMap";
import {
  calculateCurrentStep,
  cleanupAudioResources,
  getTotalSteps,
  initializeDrums,
  initializeSynths,
  scheduleFrame,
  setEngineBpm,
  setPlayState,
  setupDrumsPlayback,
  setupSynthPlayback,
  startDrawingLoop,
  stopDrawingLoop,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from "./audioEngineUtils";

const STEPS_IN_MEASURE = 16;
const drumNoteMap = noteAndKeyMap.drumNoteMap;
const DEFAULT_DRUM_RELEASE = "32n";
const STEP_DURATION_NOTATION = "16n";

const TimerTransport = () => {
  const dispatch = useDispatch();

  const synthData = useSelector(state => state.sequencer.synthData);
  const synthList = useSelector(state => state.sequencer.synthList);
  const drumsList = useSelector(state => state.sequencer.drumsData);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );

  const totalSteps = getTotalSteps(drumsList?.patterns, STEPS_IN_MEASURE);

  const synthEnginesRef = useRef({});
  const synthPartRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  const handleStepSync = (time, totalSteps, dispatch) => {
    const currentStep = calculateCurrentStep(time, totalSteps);

    scheduleFrame(time, () => {
      dispatch(setCurrentStep(currentStep));
    });
  };

  const stopAllPlayback = () => {
    cleanupAudioResources({
      synths: synthEnginesRef.current,
      parts: synthPartRef.current,
      drumEngine: drumsEngineRef.current,
      drumPart: drumsPartRef.current,
    });
    synthEnginesRef.current = {};
    synthPartRef.current = {};
    drumsEngineRef.current = null;
    drumsPartRef.current = null;
  };

  useEffect(() => {
    initializeSynths(synthList, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);
  }, []);

  useEffect(() => {
    synthList.forEach(name => {
      setupSynthPlayback(name, synthEnginesRef.current, synthPartRef.current);
    });

    setupDrumsPlayback(
      drumsEngineRef,
      drumsPartRef,
      drumNoteMap,
      DEFAULT_DRUM_RELEASE,
    );

    return () => stopAllPlayback();
  }, [synthList]);

  // Note and patterns list
  useEffect(() => {
    synthList.forEach(synthName => {
      syncInstrumentPatternsToTrack(
        synthPartRef.current[synthName],
        synthData[synthName],
      );
    });

    syncDrumPatternsToTrack(drumsPartRef.current, drumsList, drumNoteMap);
  }, [synthData, drumsList, synthList]);

  useEffect(() => {
    const drawingProcess = startDrawingLoop(
      time => handleStepSync(time, totalSteps, dispatch),
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
