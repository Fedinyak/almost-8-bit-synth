import { useEffect, useRef } from "react";
import * as Tone from "tone";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";

const TimerTransport = ({ sequencerNoteGrid }) => {
  const dispatch = useDispatch();

  const instrumentsData = useSelector(state => state.sequencer.instrumentsData);
  const instrumentsList = useSelector(state => state.sequencer.instrumentsList);
  const drumsData = useSelector(state => state.sequencer.drums); // Достаем барабаны
  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );
  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);

  const enginesRef = useRef({});
  const partsRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  // --- ЭФФЕКТ №1: "ЖЕЛЕЗО" (Создание и Dispose) ---
  // Срабатывает только при изменении списка инструментов
  useEffect(() => {
    // 1. Инициализация СИНТОВ
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
        part.loopEnd = "1m";
        partsRef.current[id] = part;
      }
    });

    // 2. Инициализация БАРАБАНОВ
    if (!drumsEngineRef.current) {
      drumsEngineRef.current = {
        kick: new Tone.MembraneSynth().toDestination(),
        snare: new Tone.NoiseSynth({
          envelope: { decay: 0.1 },
        }).toDestination(),
      };

      const dPart = new Tone.Part((time, value) => {
        const engine = drumsEngineRef.current;
        if (value.note === "C1")
          engine.kick.triggerAttackRelease("C1", "8n", time);
        if (value.note === "D1") engine.snare.triggerAttackRelease("16n", time);
      }, []).start(0);

      dPart.loop = true;
      dPart.loopEnd = "1m";
      drumsPartRef.current = dPart;
    }

    // --- ПОЛНЫЙ DISPOSE (Очистка памяти) ---
    return () => {
      // Чистим синты
      Object.keys(partsRef.current).forEach(id => {
        partsRef.current[id].dispose();
        enginesRef.current[id].dispose();
      });
      // Чистим барабаны
      if (drumsPartRef.current) {
        drumsPartRef.current.dispose();
      }
      if (drumsEngineRef.current) {
        drumsEngineRef.current.kick.dispose();
        drumsEngineRef.current.snare.dispose();
      }
      // Обнуляем Ref, чтобы при перезапуске всё создалось чисто
      enginesRef.current = {};
      partsRef.current = {};
      drumsEngineRef.current = null;
      drumsPartRef.current = null;
    };
  }, [instrumentsList]); // <--- Срабатывает только при изменении списка, не при кликах!

  // --- ЭФФЕКТ №2: "НОТЫ" (Обновление сетки) ---
  // Срабатывает при каждом клике, НО НЕ вызываем Dispose (звук не заикается)
  useEffect(() => {
    // Обновляем ноты СИНТОВ
    instrumentsList.forEach(id => {
      const part = partsRef.current[id];
      const data = instrumentsData[id];
      if (part && data?.sequencerNoteGrid) {
        part.clear();
        data.sequencerNoteGrid.forEach(item => {
          if (item.note) part.add(item.time, item);
        });
      }
    });

    // Обновляем ноты БАРАБАНОВ
    const dPart = drumsPartRef.current;
    if (dPart && drumsData?.sequencerNoteGrid) {
      dPart.clear();
      drumsData.sequencerNoteGrid.forEach(item => {
        if (item.note) dPart.add(item.time, item);
      });
    }
    // Зависимость от Ref гарантирует, что мы наполним партию сразу после её создания
  }, [instrumentsData, drumsData, instrumentsList, drumsPartRef.current]);

  // --- ЭФФЕКТЫ ТРАНСПОРТА (BPM, Play/Stop, Step Indicator) ---
  useEffect(() => {
    if (sequencerPlayState === "start") Tone.Transport.start();
    if (sequencerPlayState === "stop") Tone.Transport.stop();
  }, [sequencerPlayState]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const repeatId = Tone.Transport.scheduleRepeat(time => {
      Tone.Draw.schedule(() => {
        const step = Math.floor(
          (Tone.Transport.ticks / Tone.Transport.PPQ / 0.25) % sequencerStep,
        );
        dispatch(setCurrentStep(step));
      }, time);
    }, "16n");
    return () => Tone.Transport.clear(repeatId);
  }, [sequencerStep, dispatch]);

  return null;
};

export default TimerTransport;
