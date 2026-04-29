import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";
import noteAndKeyMap from "../constants.js/noteAndKeyMap";
import createSynth from "./synthEngine";
import createDrums from "./drumEngine";

const steps = 16;
const drumNoteMap = noteAndKeyMap.drumNoteMap;

const TimerTransport = () => {
  const dispatch = useDispatch();

  const synthData = useSelector(state => state.sequencer.synthData);
  const synthList = useSelector(state => state.sequencer.synthList);
  const drumsList = useSelector(state => state.sequencer.drumsData);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );

  // Используем общую длину всех паттернов (16 шагов * количество тактов)
  const totalSteps = (drumsList?.patterns?.length || 1) * steps;

  const synthEnginesRef = useRef({});
  const synthPartRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  const microTimingOffset = drumIndex => {
    const DRUM_PHASE_OFFSET = 0.001;
    return drumIndex * DRUM_PHASE_OFFSET;
  };

  // Synth and drum create
  useEffect(() => {
    // Synth create
    synthList.forEach(synthName => {
      if (!synthEnginesRef.current[synthName]) {
        synthEnginesRef.current[synthName] = createSynth();
      }
    });

    // Drums create
    if (!drumsEngineRef.current) {
      drumsEngineRef.current = createDrums();
    }
  }, []);

  // const playSynthNote = (synth, time, value) => {};

  // Make pattern
  useEffect(() => {
    synthList.forEach(synthName => {
      const synthPart = new Tone.Part((time, value) => {
        // console.log(
        //   time,
        //   value,
        //   synthEnginesRef,
        //   synthEnginesRef.current[synthName],
        //   synthName,
        //   "synthEnginesRef.current[synthName]",
        // );
        synthEnginesRef.current[synthName].triggerAttackRelease(
          value.note,
          value.duration,
          time,
        );
      }, []).start(0);

      synthPart.loop = true;
      synthPartRef.current[synthName] = synthPart;
    });

    const drumPart = new Tone.Part((time, value) => {
      const engine = drumsEngineRef.current;
      // Используем Tone.Transport.seconds для синхронизации,
      // но прибавляем крошечный буфер Tone.immediate(), чтобы избежать "прошлого"
      const playTime = Math.max(time, Tone.now() + 0.01);

      const drumNote = drumNoteMap[value.note];
      engine[drumNote].triggerAttackRelease("32n", playTime);
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

    return () => {
      // Clean audio and refs

      // Object.keys(synthPartRef.current).forEach(id => {
      //   synthPartRef.current[id].dispose();
      //   synthEnginesRef.current[id].dispose();
      // });
      // if (drumsPartRef.current) drumsPartRef.current.dispose();
      // if (drumsEngineRef.current) {
      //   Object.values(drumsEngineRef.current).forEach(synth => synth.dispose());
      // }
      Object.values(synthPartRef.current).forEach(part => part?.dispose());
      Object.values(synthEnginesRef.current).forEach(synth => synth?.dispose());

      drumsPartRef.current?.dispose();
      Object.values(drumsEngineRef.current || {}).forEach(synth =>
        synth?.dispose(),
      );

      synthEnginesRef.current = {};
      synthPartRef.current = {};
      drumsEngineRef.current = null;
      drumsPartRef.current = null;
    };
  }, []);

  // Note and patterns list

  const calculateAbsoluteTime = (time, measureIndex) => {
    return (
      Tone.Time(time).toSeconds() + Tone.Time(`${measureIndex}m`).toSeconds()
    );
  };

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

            const noteToPlay = drumNoteMap[drumName];
            if (!noteToPlay) return;

            trackSteps.forEach((isHit, stepIndex) => {
              if (isHit === 1) {
                const stepTime = `0:0:${stepIndex}`;
                const startTime =
                  calculateAbsoluteTime(stepTime, measureIndex) +
                  microTimingOffset(drumIndex);

                drumPart.add(startTime, { note: noteToPlay });
              }
            });
          },
        );
      });
      drumPart.loopEnd = `${drumsList.patterns.length}m`;
    }
  }, [synthData, drumsList, synthList]);

  // Transport controller
  useEffect(() => {
    if (sequencerPlayState === "start") Tone.Transport.start();
    else Tone.Transport.stop();
  }, [sequencerPlayState]);

  // BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Scheduler
  useEffect(() => {
    const repeatId = Tone.Transport.scheduleRepeat(time => {
      Tone.Draw.schedule(() => {
        // Рассчитываем шаг с учетом всех тактов
        const step = Math.floor(
          (Tone.Transport.ticks / Tone.Transport.PPQ / 0.25) % totalSteps,
        );
        dispatch(setCurrentStep(step));
      }, time);
    }, "16n");
    return () => Tone.Transport.clear(repeatId);
  }, [totalSteps, dispatch]);

  return null;
};

export default TimerTransport;
