import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import {
  nextCurrentPatternIndex,
  setCurrentStep,
} from "../slices/sequencerSlice";
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
  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);
  const isLooping = useSelector(state => state.sequencer.isLooping);
  const currentPatternIndex = useSelector(
    state => state.sequencer.currentPatternIndex,
  );

  // Берем первый доступный инструмент, чтобы узнать, сколько всего паттернов в проекте
  const firstInstrumentId = instrumentsList[0];
  const totalPatternsCount =
    instrumentsData[firstInstrumentId]?.patterns?.length || 0;

  const drumNoteMap = noteAndKeyMap.drumNoteMap;
  // const drumNoteMap = useSelector(state=> )
  // Используем общую длину всех паттернов (16 шагов * количество тактов)
  // const totalSteps = (drumsData?.patterns?.length || 1) * 16;

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
        // hiHat: new Tone.MetalSynth({
        //   envelope: { decay: 0.05 },
        //   volume: -12,
        // }).toDestination(),
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
          // case "E1":
          //   engine.hiHat.triggerAttackRelease("32n", playTime);
          //   break;
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

        // Выбираем: либо все паттерны (если луп выключен),
        // либо только один текущий (если луп включен)
        const patternsToRender = isLooping
          ? [instrument.patterns[currentPatternIndex]]
          : instrument.patterns;

        patternsToRender.forEach((patternGrid, measureIndex) => {
          if (!patternGrid) return; // защита от пустых данных

          patternGrid.forEach(item => {
            if (item.note) {
              // Если включен луп, measureIndex всегда будет 0,
              // и ноты встанут в начало таймлайна

              const absoluteTime =
                Tone.Time(item.time).toSeconds() +
                Tone.Time(`${measureIndex}m`).toSeconds();
              part.add(absoluteTime, item);
            }
          });
        });
        // Устанавливаем конец петли в зависимости от количества загруженных паттернов
        part.loop = true; // Включаем внутренний луп самого Part
        part.loopEnd = isLooping ? "1m" : `${instrument.patterns.length}m`;
      }
    });

    // 2. Обновляем БАРАБАНЫ
    const dPart = drumsPartRef.current;
    if (dPart && drumsData?.patterns) {
      dPart.clear();

      const targetDrums = isLooping
        ? [drumsData.patterns[currentPatternIndex]]
        : drumsData.patterns;

      targetDrums.forEach((patternObj, measureIndex) => {
        // CHANGED: Получаем массив ключей, чтобы иметь индекс (drumIdx) для смещения
        if (!patternObj) return;
        const drumNames = Object.keys(patternObj);

        drumNames.forEach((drumName, drumIdx) => {
          const trackSteps = patternObj[drumName];

          if (Array.isArray(trackSteps)) {
            trackSteps.forEach((isHit, stepIndex) => {
              if (isHit === 1) {
                const stepTime = `0:0:${stepIndex}`;

                // ADDED: (drumIdx * 0.005) — это "микро-очередь".
                // Она разносит инструменты на одном шаге на 5мс, чтобы MetalSynth не падал в ошибку.
                const absoluteTime =
                  Tone.Time(stepTime).toSeconds() +
                  Tone.Time(`${measureIndex}m`).toSeconds() +
                  drumIdx * 0.005;

                const noteToPlay = drumNoteMap[drumName];

                if (noteToPlay) {
                  dPart.add(absoluteTime, { note: noteToPlay });
                }
              }
            });
          }
        });
      });

      dPart.loop = true;
      dPart.loopEnd = isLooping ? "1m" : `${drumsData.patterns.length}m`;
    }
    // eslint-disable-next-line react-hooks/refs
  }, [
    instrumentsData,
    drumsData,
    instrumentsList,
    drumsPartRef.current,
    currentPatternIndex,
    isLooping,
  ]);

  // --- ТРАНСПОРТ И ШАГИ ---
  useEffect(() => {
    switch (sequencerPlayState) {
      case "start":
        Tone.Transport.start();
        break;

      case "pause":
        // Замораживает время (ticks), не сбрасывая его в ноль
        Tone.Transport.pause();
        break;

      case "stop":
        // Полностью останавливает и сбрасывает время в 0
        Tone.Transport.stop();
        // Опционально: сбрасываем индикацию шага в UI на первый шаг
        // dispatch(setCurrentStep(0));
        break;

      default:
        break;
    }
  }, [sequencerPlayState, dispatch]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // предохранитель (ref)
  const lastProcessedStep = useRef(-1);

  useEffect(() => {
    const STEPS_IN_PATTERN = 16;

    const repeatId = Tone.Transport.scheduleRepeat(time => {
      const ticks = Tone.Transport.ticks;
      const ppq = Tone.Transport.PPQ;
      const current16thNote = Math.round(ticks / (ppq / 4));
      const step = current16thNote % STEPS_IN_PATTERN;

      if (step !== lastProcessedStep.current) {
        Tone.Draw.schedule(() => {
          dispatch(setCurrentStep(step));
        }, time);

        // МОМЕНТ ПЕРЕХОДА (15 -> 0)
        if (step === 0 && lastProcessedStep.current === STEPS_IN_PATTERN - 1) {
          if (isLooping) {
            // Если включен ЛУП: прыгаем в начало ТЕКУЩЕГО такта
            // Нам не нужно перерисовывать Part, мы просто перематываем "пленку" назад
            const startOfCurrentPattern = currentPatternIndex * (ppq * 4);
            Tone.Transport.ticks = startOfCurrentPattern;

            // Индекс паттерна НЕ меняем (dispatch не нужен)
          } else {
            // Если НЕ ЛУП:
            if (currentPatternIndex === totalPatternsCount - 1) {
              // Если это был конец всей песни — прыгаем в самый 0
              Tone.Transport.ticks = 0;
              dispatch(nextCurrentPatternIndex());
            } else {
              // Если это просто переход с 0 на 1 такт — НИЧЕГО не трогаем в Transport
              // Он сам въедет во второй такт, где уже лежат ноты
              dispatch(nextCurrentPatternIndex());
            }
          }
        }
        lastProcessedStep.current = step;
      }
    }, "16n");

    return () => Tone.Transport.clear(repeatId);
  }, [dispatch, isLooping, currentPatternIndex, totalPatternsCount]);

  return null;
};

export default TimerTransport;
