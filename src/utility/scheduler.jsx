import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";
import noteAndKeyMap from "../constants.js/noteAndKeyMap";

const steps = 16;

const TimerTransport = () => {
  const dispatch = useDispatch();

  const synthData = useSelector(state => state.sequencer.synthData);
  const synthList = useSelector(state => state.sequencer.synthList);
  const drumsList = useSelector(state => state.sequencer.drums);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );
  const drumNoteMap = noteAndKeyMap.drumNoteMap;

  // Используем общую длину всех паттернов (16 шагов * количество тактов)
  const totalSteps = (drumsList?.patterns?.length || 1) * steps;

  const synthEnginesRef = useRef({});
  const partsRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  // Synth and drum init
  useEffect(() => {
    synthList.forEach(id => {
      // Synth init
      if (!synthEnginesRef.current[id]) {
        synthEnginesRef.current[id] = new Tone.MonoSynth({
          oscillator: { type: "square" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        }).toDestination();
      }

      // Drum init
      if (!drumsEngineRef.current) {
        const drumsEngine = {
          kick: new Tone.MembraneSynth().toDestination(),
          snare: new Tone.NoiseSynth({
            envelope: { decay: 0.1 },
          }).toDestination(),
          hiHat: new Tone.MetalSynth({
            envelope: { decay: 0.05 },
            volume: -12,
          }).toDestination(),
          hiHatClose: new Tone.MetalSynth({
            envelope: { decay: 0.04 },
            volume: -12,
          }).toDestination(),
          hiHatOpen: new Tone.MetalSynth({
            envelope: { decay: 0.3 },
            volume: -10,
          }).toDestination(),
          crash: new Tone.MetalSynth({
            envelope: { attack: 0.01, decay: 1.5 },
            volume: -8,
          }).toDestination(),
          ride: new Tone.MetalSynth({
            envelope: { attack: 0.001, decay: 0.8 },
            volume: -10,
          }).toDestination(),
          tom: new Tone.MembraneSynth({
            pitchDecay: 0.08,
            octaves: 4,
          }).toDestination(),
        };

        drumsEngineRef.current = drumsEngine;
      }
    });
  }, [synthList]);

  useEffect(() => {
    synthList.forEach(id => {
      const part = new Tone.Part((time, value) => {
        synthEnginesRef.current[id].triggerAttackRelease(
          value.note,
          value.duration,
          time,
        );
      }, []).start(0);

      part.loop = true;
      partsRef.current[id] = part;
      // }
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
    // }

    return () => {
      Object.keys(partsRef.current).forEach(id => {
        partsRef.current[id].dispose();
        synthEnginesRef.current[id].dispose();
      });
      if (drumsPartRef.current) drumsPartRef.current.dispose();
      if (drumsEngineRef.current) {
        Object.values(drumsEngineRef.current).forEach(synth => synth.dispose());
      }
      synthEnginesRef.current = {};
      partsRef.current = {};
      drumsEngineRef.current = null;
      drumsPartRef.current = null;
    };
  }, [synthList]);

  // Note and patterns list
  useEffect(() => {
    // Synth
    synthList.forEach(id => {
      const part = partsRef.current[id];
      const instrument = synthData[id];
      if (part && instrument?.patterns) {
        part.clear();
        instrument.patterns.forEach((patternGrid, measureIndex) => {
          patternGrid.forEach(item => {
            if (item.note) {
              const absoluteTime =
                Tone.Time(item.time).toSeconds() +
                Tone.Time(`${measureIndex}m`).toSeconds();
              part.add(absoluteTime, item);
            }
          });
        });
        part.loopEnd = `${instrument.patterns.length}m`;
      }
    });

    // Drum
    const drumPart = drumsPartRef.current;
    if (drumPart && drumsList?.patterns) {
      drumPart.clear();

      drumsList.patterns.forEach((patternObj, measureIndex) => {
        Object.keys(patternObj).forEach((drumName, drumIdx) => {
          const trackSteps = patternObj[drumName];

          if (Array.isArray(trackSteps)) {
            trackSteps.forEach((isHit, stepIndex) => {
              if (isHit === 1) {
                const stepTime = `0:0:${stepIndex}`;
                // add (drumIdx * 0.001)
                // Это разносит инструменты на 1 миллисекунду друг от друга, убирая ошибку
                const absoluteTime =
                  Tone.Time(stepTime).toSeconds() +
                  Tone.Time(`${measureIndex}m`).toSeconds() +
                  drumIdx * 0.001;

                const noteToPlay = drumNoteMap[drumName];

                if (noteToPlay) {
                  drumPart.add(absoluteTime, { note: noteToPlay });
                }
              }
            });
          }
        });
      });
      drumPart.loopEnd = `${drumsList.patterns.length}m`;
    }
    // eslint-disable-next-line react-hooks/refs
  }, [synthData, drumsList, synthList, drumsPartRef.current]);

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
