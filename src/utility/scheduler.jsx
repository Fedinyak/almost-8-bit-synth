import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";
import noteAndKeyMap from "../constants.js/noteAndKeyMap";
import {
  calculateAbsoluteTime,
  calculateCurrentStep,
  cleanupAudioResources,
  compensateLatency,
  getTotalSteps,
  initializeDrums,
  initializeSynths,
  microTimingOffset,
  playDrumHit,
  playSynthNote,
  scheduleFrame,
  setEngineBpm,
  setPlayState,
  startDrawingLoop,
  stopDrawingLoop,
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

  const shutdownEngine = () => {
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

  // Make pattern
  useEffect(() => {
    synthList.forEach(synthName => {
      const synthPart = new Tone.Part((time, noteData) => {
        const currentSynth = synthEnginesRef.current[synthName];

        if (currentSynth) {
          playSynthNote(currentSynth, time, noteData);
        }
      }, []).start(0);

      synthPart.loop = true;
      synthPartRef.current[synthName] = synthPart;
    });

    const drumPart = new Tone.Part((time, noteData) => {
      const drumEngine = drumsEngineRef.current;
      if (!drumEngine) return;

      const playTime = compensateLatency(time);
      const noteKey = drumNoteMap[noteData.note];
      const drumInstrument = drumEngine[noteKey];

      if (drumInstrument) {
        playDrumHit(drumInstrument, DEFAULT_DRUM_RELEASE, playTime);
      }
      // console.log(
      //   engine[drumNote],
      //   // value,
      //   "engine[drumNote].engine[drumNote].engine[drumNote].engine[drumNote].",
      // );
      // switch (value.note) {
      //   case "C1":
      //     engine.kick.triggerAttackRelease("C1", "8n", playTime);
      //     break;
      //   case "D1":
      //     engine.snare.triggerAttackRelease("16n", playTime);
      //     break;
      //   case "E1":
      //     engine.hiHat.triggerAttackRelease("32n", playTime);
      //     break;
      //   case "F1":
      //     engine.hiHatClose.triggerAttackRelease("32n", playTime);
      //     break;
      //   case "G1":
      //     engine.hiHatOpen.triggerAttackRelease("8n", playTime);
      //     break;
      //   case "A1":
      //     engine.crash.triggerAttackRelease("G2", "1n", playTime);
      //     break;
      //   case "B1":
      //     engine.ride.triggerAttackRelease("A2", "4n", playTime);
      //     break;
      //   case "C2":
      //     engine.tom.triggerAttackRelease("G2", "16n", playTime);
      //     break;
      //   default:
      //     break;
      // }
    }, []).start(0);

    drumPart.loop = true;
    drumsPartRef.current = drumPart;

    return () => shutdownEngine();
  }, [synthList]);

  // Note and patterns list
  useEffect(() => {
    // Synth
    synthList.forEach(synthName => {
      const part = synthPartRef.current[synthName];
      const instrument = synthData[synthName];

      if (part && instrument?.patterns) {
        part.clear();
        instrument.patterns.forEach((patternGrid, measureIndex) => {
          patternGrid
            .filter(item => item.note)
            .forEach(item => {
              part.add(calculateAbsoluteTime(item.time, measureIndex), item);
            });
        });
        part.loopEnd = `${instrument.patterns.length}m`;
      }
    });

    // Drum
    const drumPart = drumsPartRef.current;
    if (drumPart && drumsList?.patterns) {
      drumPart.clear();

      drumsList.patterns.forEach((drumsInMeasure, measureIndex) => {
        Object.entries(drumsInMeasure).forEach(
          ([drumName, trackSteps], drumIndex) => {
            if (!Array.isArray(trackSteps)) return;

            const note = drumNoteMap[drumName];
            if (!note) return;

            trackSteps.forEach((isHit, stepIndex) => {
              if (isHit === 1) {
                const stepTime = `0:0:${stepIndex}`;
                const startTime =
                  calculateAbsoluteTime(stepTime, measureIndex) +
                  microTimingOffset(drumIndex);

                drumPart.add(startTime, { note });
              }
            });
          },
        );
      });
      drumPart.loopEnd = `${drumsList.patterns.length}m`;
    }
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

  // BPM
  useEffect(() => {
    setEngineBpm(bpm);
  }, [bpm]);

  return null;
};

export default TimerTransport;
