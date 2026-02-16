import { useEffect, useRef } from "react";
import * as Tone from "tone";
// import BpmVisualizer from "../components/sequencer/BpmVisualizer";
// import { synth } from "./playSound";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";

const TimerTransport = () => {
  const dispatch = useDispatch();

  const instrumentsData = useSelector(state => state.sequencer.instrumentsData);
  const instrumentsList = useSelector(state => state.sequencer.instrumentsList);
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );
  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);

  // 1. Make container. Don't change on render
  const enginesRef = useRef({});
  // const partRef = useRef({});
  const partsRef = useRef({});

  // // 2. Initialization on first start app
  // useEffect(() => {
  //   // Save a link to it in partRef.current
  //   partRef.current = new Tone.Part((time, event) => {
  //     synth.triggerAttackRelease(event.note, event.duration, time);
  //   }, []).start(0);

  //   partRef.current.loop = true;
  //   // partRef.current.loopEnd = "2m"; // loop length
  //   partRef.current.loopEnd = "1m"; // loop length

  //   // If component deleted, clear sound from memory
  //   return () => {
  //     if (partRef.current) {
  //       partRef.current.dispose();
  //     }
  //   };
  // }, []);

  useEffect(() => {
    instrumentsList.forEach(instrument => {
      const data = instrumentsData[instrument];

      // ШАГ 1: Инициализация инструмента (Ленивая загрузка)
      // Если в реестре ещё нет инструмента с таким ID — создаем его.
      if (!enginesRef.current[instrument]) {
        console.log(`Инициализация нового инструмента: ${instrument}`);
        if (data.type === "drums") {
          // Для барабанов мы создаем ОБЪЕКТ, содержащий два разных синтезатора
          enginesRef.current[instrument] = {
            kick: new Tone.MembraneSynth().toDestination(),
            snare: new Tone.NoiseSynth({
              noise: { type: "white" },
              envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
            }).toDestination(),
            type: "drums", // Пометка, что это барабаны
          };
        }
        if (data.type === "synth") {
          enginesRef.current[instrument] = new Tone.MonoSynth({
            oscillator: { type: "square" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
          }).toDestination();
        }

        // enginesRef.current[instrument] = { kick, snare }; // Сохраняем пачкой
        const currentId = instrument;
        const currentType = data.type;

        // Создаем партию с логикой распределения нот
        const newPart = new Tone.Part((time, value) => {
          const engine = enginesRef.current[currentId];
          // if (!engine) return;
          if (currentType === "drums") {
            // Если это барабаны, вызываем методы ВНУТРЕННИХ объектов (kick/snare)
            if (value.note === "C1") {
              engine.kick.triggerAttackRelease("C1", "8n", time);
            } else if (value.note === "D1") {
              engine.snare.triggerAttackRelease("16n", time);
            }
          } else {
            // Если это синт, вызываем метод напрямую у engine
            engine.triggerAttackRelease(value.note, value.duration, time);
          }
        }, []).start(0);
        newPart.loop = true;
        newPart.loopEnd = "1m";

        partsRef.current[instrument] = newPart;
        // drumPart.loop = true;
        // drumPart.loopEnd = "1m";
        // partsRef.current[instrument] = drumPart;
        // } else {
        //   enginesRef.current[instrument] = new Tone.MonoSynth({
        //     oscillator: { type: "square" },
        //     envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
        //   }).toDestination();

        // ШАГ 2: Создание Партии (Tone.Part)
        // Это планировщик, который будет вызывать звук.
        // Передаем callback: "Когда наступит время 'time', возьми данные 'value' и играй"
        // const newPart = new Tone.Part((time, value) => {
        //   enginesRef.current[instrument].triggerAttackRelease(
        //     value.note, // Какую ноту играть (например, "C4")
        //     value.duration, // Как долго (например, "8n")
        //     time, // Точное время из аудио-контекста
        //   );
        // }, []).start(0); // Запускаем партию сразу, чтобы она слушала транспорт

        // --- ОПТИМИЗАЦИЯ: Настройка Loop только один раз при создании ---
      }

      // ШАГ 3: Синхронизация данных сетки с Tone.js
      // Получаем доступ к созданной партии для текущего инструмента
      const currentPart = partsRef.current[instrument];

      if (currentPart) {
        // Очищаем старые ноты в расписании этого инструмента
        currentPart.clear();

        // Проходим по массиву sequencerNoteGrid и добавляем только активные ноты
        data.sequencerNoteGrid.forEach(item => {
          if (item.note) {
            // Добавляем событие в расписание. Tone.js сам разберется, когда его играть.
            currentPart.add(item.time, item);
          }
        });
      }
    });

    // --- ФУНКЦИЯ ОЧИСТКИ (DISPOSE) ---
    return () => {
      // Проходим по всем инструментам, которые были созданы
      Object.keys(partsRef.current).forEach(item => {
        // 1. Останавливаем и удаляем планировщик
        partsRef.current[item].dispose();
        // 2. Удаляем сам синтезатор из памяти аудио-контекста
        // enginesRef.current[item].dispose();
        const engine = enginesRef.current[item];
        if (engine.kick && engine.snare) {
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
  }, [instrumentsData, instrumentsList]);

  // Change date on change grid
  // useEffect(() => {
  //   if (partRef.current) {
  //     // Очищаем только события внутри ПАРТИИ, не удаляя саму партию
  //     partRef.current.clear();

  //     // Заполняем существующую партию новыми данными из пропса
  //     sequencerNoteGrid.forEach(item => {
  //       if (item.note) {
  //         partRef.current.add(item.time, item);
  //       }
  //     });
  //   }
  // }, [sequencerNoteGrid]); // Следим за изменениями сетки

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
