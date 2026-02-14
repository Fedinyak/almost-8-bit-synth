import { useEffect, useRef } from "react";
import * as Tone from "tone";
// import BpmVisualizer from "../components/sequencer/BpmVisualizer";
import { synth } from "./playSound";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentStep } from "../slices/sequencerSlice";

const TimerTransport = ({ sequencerNoteGrid }) => {
  // note !== null
  // const notesToPlay = sequencerNoteGrid.filter(item => item.note !== null);
  // 1. Make container. Don't change on render
  const dispatch = useDispatch();

  const bpm = useSelector(state => state.sequencer.bpm);
  const sequencerPlayState = useSelector(
    state => state.sequencer.sequencerPlayState,
  );

  const partRef = useRef(null);

  // 2. Initialization on first start app
  useEffect(() => {
    // Save a link to it in partRef.current
    partRef.current = new Tone.Part((time, event) => {
      synth.triggerAttackRelease(event.note, event.duration, time);
    }, []).start(0);

    partRef.current.loop = true;
    // partRef.current.loopEnd = "2m"; // loop length
    partRef.current.loopEnd = "1m"; // loop length

    // If component deleted, clear sound from memory
    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
    };
  }, []);

  // Change date on change grid
  useEffect(() => {
    if (partRef.current) {
      // Очищаем только события внутри ПАРТИИ, не удаляя саму партию
      partRef.current.clear();

      // Заполняем существующую партию новыми данными из пропса
      sequencerNoteGrid.forEach(item => {
        if (item.note) {
          partRef.current.add(item.time, item);
        }
      });
    }
  }, [sequencerNoteGrid]); // Следим за изменениями сетки

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
        const totalSteps = sequencerNoteGrid.length;

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
  }, [sequencerNoteGrid.length, dispatch]);
};

export default TimerTransport;
