import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";

const TimerTransport = () => {
  const dispatch = useDispatch();

  const drumsData = useSelector(state => state.sequencer.drums);

  const instrumentsData = useSelector(state => state.sequencer.instrumentsData);
  const instrumentsList = useSelector(state => state.sequencer.instrumentsList);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );
  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);

  // 1. Make container. Don't change on render
  const enginesRef = useRef({});
  const partsRef = useRef({});

  const drumsEngineRef = useRef({});
  const drumsPartRef = useRef({});

  // Synth engine
  useEffect(() => {
    instrumentsList.forEach(instrument => {
      // const data = instrumentsData[instrument];

      // ШАГ 1: Инициализация инструмента (Ленивая загрузка)
      // Если в реестре ещё нет инструмента с таким ID — создаем его.
      if (!enginesRef.current[instrument]) {
        console.log(`Инициализация нового инструмента: ${instrument}`);
        // if (data.type === "drums") {
        //   // Для барабанов мы создаем ОБЪЕКТ, содержащий два разных синтезатора
        //   enginesRef.current[instrument] = {
        //     kick: new Tone.MembraneSynth().toDestination(),
        //     snare: new Tone.NoiseSynth({
        //       noise: { type: "white" },
        //       envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        //     }).toDestination(),
        //     // type: "drums", // Пометка, что это барабаны
        //     isDrums: true,
        //   };
        // }
        // if (data.type === "synth") {
        enginesRef.current[instrument] = new Tone.MonoSynth({
          oscillator: { type: "square" },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        }).toDestination();
        // }

        // Создаем партию с логикой распределения нот
        const currentId = instrument;
        // const currentType = data.type;

        const newPart = new Tone.Part((time, value) => {
          const engine = enginesRef.current[currentId];
          if (!engine) return;

          // if (engine.isDrums) {
          //   if (value.note === "C1") {
          //     engine.kick.triggerAttackRelease("C1", "8n", time);
          //   } else if (value.note === "D1") {
          //     engine.snare.triggerAttackRelease("16n", time);
          //   }
          // } else {
          engine.triggerAttackRelease(value.note, value.duration, time);
          // }
        }, []).start(0);

        newPart.loop = true;
        newPart.loopEnd = "1m";
        partsRef.current[instrument] = newPart;
      }
    });

    // --- ФУНКЦИЯ ОЧИСТКИ (DISPOSE) ---
    return () => {
      // Проходим по всем инструментам, которые были созданы
      Object.keys(partsRef.current).forEach(item => {
        // 1. Останавливаем и удаляем планировщик
        partsRef.current[item].dispose();
        // 2. Удаляем сам синтезатор из памяти аудио-контекста
        const engine = enginesRef.current[item];
        if (engine.isDrums) {
          // Если это барабаны (объект), удаляем оба узла
          engine.kick.dispose();
          engine.snare.dispose();
        } else {
          // Если это обычный синт
          engine.dispose();
        }

        console.log(`Инструмент ${item} полностью удален из памяти`);
      });

      // Обнуляем рефы, чтобы при следующем запуске всё создалось чисто
      partsRef.current = {};
      enginesRef.current = {};
    };
  }, [instrumentsList]);

  // Drums engine
  useEffect(() => {
    if (!drumsEngineRef.current) {
      console.log(`Инициализация нового инструмента: ${drumsEngineRef}`);
      drumsEngineRef.current = {
        kick: new Tone.MembraneSynth().toDestination(),
        snare: new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        }).toDestination(),
      };

      drumsPartRef.current = new Tone.Part((time, value) => {
        const engine = drumsEngineRef.current;

        if (!engine) {
          console.log("Движок барабанов еще не готов!");
          return;
        }

        if (value.note === "C1") {
          console.log("Бью в Бочку!");
          drumsEngineRef.kick.triggerAttackRelease("C1", "8n", time);
        } else if (value.note === "D1") {
          drumsEngineRef.snare.triggerAttackRelease("16n", time);
        }
      }, []).start(0);

      drumsPartRef.loop = true;
      drumsPartRef.loopEnd = "1m";
    }

    // --- ФУНКЦИЯ ОЧИСТКИ (DISPOSE) ---
    return () => {
      // Сначала проверяем, существует ли ref, а затем — есть ли у него метод dispose
      if (
        drumsPartRef.current &&
        typeof drumsPartRef.current.dispose === "function"
      ) {
        drumsPartRef.current.dispose();
        drumsPartRef.current = null; // Обнуляем ссылку
      }
      if (drumsEngineRef.current) {
        const { kick, snare } = drumsEngineRef.current;

        if (kick && typeof kick.dispose === "function") {
          kick.dispose();
        }
        if (snare && typeof snare.dispose === "function") {
          snare.dispose();
        }
        console.log("Драм-машина удалена из памяти");
      }
      drumsEngineRef.current = {};
    };
  }, []);

  // Synth
  useEffect(() => {
    instrumentsList.forEach(instrument => {
      const data = instrumentsData[instrument];
      const currentPart = partsRef.current[instrument];

      if (currentPart && data.sequencerNoteGrid) {
        // Очищаем старые ноты в расписании этого инструмента
        currentPart.clear(); // Очистка нот не трогает сам синтезатор
        data.sequencerNoteGrid.forEach(item => {
          // Проходим по массиву sequencerNoteGrid и добавляем только активные ноты
          if (item.note) currentPart.add(item.time, item); // Добавляем событие в расписание. Tone.js сам разберется, когда его играть.
        });
      }
    });
  }, [instrumentsData, instrumentsList]);

  // Drums
  useEffect(() => {
    const currentPart = drumsPartRef.current;
    // Проверяем: 1. Существует ли партия. 2. Есть ли у неё метод clear.
    if (
      currentPart &&
      typeof currentPart.clear === "function" &&
      drumsData.sequencerNoteGrid
    ) {
      currentPart.clear();
      drumsData.sequencerNoteGrid.forEach(item => {
        if (item.note) currentPart.add(item.time, item);
      });
    }
  }, [drumsData]);

  useEffect(() => {
    if (sequencerPlayState === "start") {
      Tone.Transport.start();
    }
    if (sequencerPlayState === "stop") {
      Tone.Transport.stop();
    }
  }, [sequencerPlayState]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const repeatId = Tone.Transport.scheduleRepeat(time => {
      Tone.Draw.schedule(() => {
        const totalSteps = sequencerStep;

        // 1. Рассчитываем индекс текущего шага на основе тиков транспорта
        // 0.25 — это длительность 16-й ноты в долях.
        //  Cетка идет по 16-м нотам, используй 0.25, если по 8-м (как в твоем noteGrid), то 0.5.
        const step = Math.floor(
          (Tone.Transport.ticks / Tone.Transport.PPQ / 0.25) % totalSteps,
        );

        dispatch(setCurrentStep(step));
      }, time);
    }, "16n"); // "8n" — так как в sequencerNoteGrid шаги кратны 8-м нотам

    return () => Tone.Transport.clear(repeatId);
  }, [sequencerStep, dispatch]);
};

export default TimerTransport;
