import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";
import noteAndKeyMap from "../constants.js/noteAndKeyMap";

const TimerTransport = () => {
  const dispatch = useDispatch();

  const instrumentsData = useSelector(state => state.sequencer.instrumentsData);
  const instrumentsList = useSelector(state => state.sequencer.instrumentsList);
  const drumsData = useSelector(state => state.sequencer.drums);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );
  const drumNoteMap = noteAndKeyMap.drumNoteMap;
  // const drumNoteMap = useSelector(state=> )
  // Используем общую длину всех паттернов (16 шагов * количество тактов)
  const totalSteps = (drumsData?.patterns?.length || 1) * 16;

  const enginesRef = useRef({});
  const partsRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  // Карта соответствия: какой трек в UI — в какой синт бьет
  // const drumNoteMap = {
  //   kick: "C1",
  //   snare: "D1",
  //   hiHatClose: "E1",
  //   "hi-hat-close": "F1",
  //   "hi-hat-open": "G1",
  // };

  // --- ЭФФЕКТ №1: "ЖЕЛЕЗО" (Создание синтов) ---
  useEffect(() => {
    // Инициализация синтезаторов
    instrumentsList.forEach(id => {
      if (!enginesRef.current[id]) {
        enginesRef.current[id] = new Tone.MonoSynth({
          oscillator: { type: "square" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        }).toDestination();

        const currentId = id;
        const part = new Tone.Part((time, value) => {
          enginesRef.current[currentId].triggerAttackRelease(
            value.note,
            value.duration,
            time,
          );
        }, []).start(0);

        part.loop = true;
        partsRef.current[id] = part;
      }
    });

    // Инициализация БАРАБАНОВ
    if (!drumsEngineRef.current) {
      drumsEngineRef.current = {
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

      const dPart = new Tone.Part((time, value) => {
        const engine = drumsEngineRef.current;
        // ГЛАВНЫЙ ФИКС: Используем Tone.Transport.seconds для синхронизации,
        // но прибавляем крошечный буфер Tone.immediate(), чтобы избежать "прошлого"
        const playTime = Math.max(time, Tone.now() + 0.01);

        switch (value.note) {
          case "C1":
            engine.kick.triggerAttackRelease("C1", "8n", playTime);
            break;
          case "D1":
            engine.snare.triggerAttackRelease("16n", playTime);
            break;
          case "E1":
            engine.hiHat.triggerAttackRelease("32n", playTime);
            break;
          case "F1":
            engine.hiHatClose.triggerAttackRelease("32n", playTime);
            break;
          case "G1":
            engine.hiHatOpen.triggerAttackRelease("8n", playTime);
            break;
          case "A1":
            engine.crash.triggerAttackRelease("G2", "1n", playTime);
            break;
          case "B1":
            engine.ride.triggerAttackRelease("A2", "4n", playTime);
            break;
          case "C2":
            engine.tom.triggerAttackRelease("G2", "16n", playTime);
            break;
          default:
            break;
        }
        // Логика распределения ударов по движкам
        // if (value.note === "C1")
        //   engine.kick.triggerAttackRelease("C1", "8n", time);
        // else if (value.note === "D1")
        //   engine.snare.triggerAttackRelease("16n", time);
        // else if (value.note === "E1")
        //   engine.hiHat.triggerAttackRelease("32n", time);
        // else if (value.note === "F1")
        //   engine.hiHatOpen.triggerAttackRelease("16n", time);
        // else if (value.note === "G1")
        //   engine.crash.triggerAttackRelease("G2", "1n", time);
        // else if (value.note === "A1")
        //   engine.ride.triggerAttackRelease("A2", "4n", time);
        // else if (value.note === "B1")
        //   engine.tom.triggerAttackRelease("G2", "16n", time);
        // hiHatClose можно направить на тот же движок, что и обычный hiHat (E1)
      }, []).start(0);

      dPart.loop = true;
      drumsPartRef.current = dPart;
    }

    return () => {
      Object.keys(partsRef.current).forEach(id => {
        partsRef.current[id].dispose();
        enginesRef.current[id].dispose();
      });
      if (drumsPartRef.current) drumsPartRef.current.dispose();
      if (drumsEngineRef.current) {
        Object.values(drumsEngineRef.current).forEach(synth => synth.dispose());
      }
      enginesRef.current = {};
      partsRef.current = {};
      drumsEngineRef.current = null;
      drumsPartRef.current = null;
    };
  }, [instrumentsList]);

  // --- ЭФФЕКТ №2: "ОБНОВЛЕНИЕ НОТ И ПАТТЕРНОВ" ---
  useEffect(() => {
    // 1. Обновляем СИНТЫ
    instrumentsList.forEach(id => {
      const part = partsRef.current[id];
      const instrument = instrumentsData[id];
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

    // 2. Обновляем БАРАБАНЫ
    const dPart = drumsPartRef.current;
    if (dPart && drumsData?.patterns) {
      dPart.clear();

      drumsData.patterns.forEach((patternObj, measureIndex) => {
        Object.keys(patternObj).forEach((drumName, drumIdx) => {
          const trackSteps = patternObj[drumName];

          if (Array.isArray(trackSteps)) {
            trackSteps.forEach((isHit, stepIndex) => {
              if (isHit === 1) {
                const stepTime = `0:0:${stepIndex}`;
                // ГЛАВНОЕ ИЗМЕНЕНИЕ: Добавляем (drumIdx * 0.001)
                // Это разносит инструменты на 1 миллисекунду друг от друга, убирая ошибку
                const absoluteTime =
                  Tone.Time(stepTime).toSeconds() +
                  Tone.Time(`${measureIndex}m`).toSeconds() +
                  drumIdx * 0.001;

                const noteToPlay = drumNoteMap[drumName];

                if (noteToPlay) {
                  dPart.add(absoluteTime, { note: noteToPlay });
                }
              }
            });
          }
        });
      });
      dPart.loopEnd = `${drumsData.patterns.length}m`;
    }
    // eslint-disable-next-line react-hooks/refs
  }, [instrumentsData, drumsData, instrumentsList, drumsPartRef.current]);

  // --- ТРАНСПОРТ И ШАГИ ---
  useEffect(() => {
    if (sequencerPlayState === "start") Tone.Transport.start();
    else Tone.Transport.stop();
  }, [sequencerPlayState]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

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
