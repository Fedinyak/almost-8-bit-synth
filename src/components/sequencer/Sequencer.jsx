import { useSelector } from "react-redux";
import getNote from "../../utility/getNote";
import Cell from "./Cell";
import TimerTransport from "../../utility/scheduler";
import SequencerControlPanel from "./SequencerControlPanel";
import StepIndicator from "./StepIndicator";
import noteAndKeyMap from "../../constants.js/noteAndKeyMap";
// import * as Tone from "tone";
// import { useEffect, useState } from "react";
// import BpmVisualizer from "./BpmVisualizer";

const Sequencer = () => {
  // const keyboardLetter = useSelector(state => state.note.keyboardLetter);
  const octave = useSelector(state => state.note.octave);
  const sequencerNoteGrid = useSelector(
    state => state.sequencer.sequencerNoteGrid,
  );
  // const noteMap = useSelector(state => state.note.noteMap);
  // const octaveMap = useSelector(state => state.note.noteOctaveIndexMap);
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

  return (
    <section className="sequencer">
      <SequencerControlPanel />
      <TimerTransport sequencerNoteGrid={sequencerNoteGrid} />
      <div className="sequencer-note-title">
        {keyboardLetter.map(letter => {
          return (
            <p className="sequencer-note-title-item" key={letter}>
              {getNote(letter, octave, noteMap, octaveMap)}
            </p>
          );
        })}
      </div>
      <div className="sequencer-cells">
        {sequencerNoteGrid.map((item, i) => {
          return (
            <div className="sequencer-cells-row" key={i}>
              <StepIndicator key={`${i}-step`} stepIndex={i} />
              {keyboardLetter.map(letter => {
                // console.log(sequencerNoteGrid[i], "sequencerNoteGrid[i]");
                return (
                  <Cell
                    className="sequencer-cell"
                    key={letter + i + octave}
                    note={getNote(letter, octave, noteMap, octaveMap)}
                    sequencerActiveNote={sequencerNoteGrid[i]}
                    step={i}
                  />
                );
              })}
              <br />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Sequencer;

// В. Sequence и Loop (Классы-обертки) — Рекомендуется
// Самый удобный способ для секвенсора. Sequence позволяет передать массив нот и автоматически итерировать по ним.
// javascript
// const seq = new Tone.Sequence((time, note) => {
//   synth.triggerAttackRelease(note, "16n", time);
// }, ["C4", ["E4", "D4"], "G4", "A4"], "4n").start(0);

// 5. Синхронизация с React
// Главная проблема — замыкания. Если вы используете useState внутри колбэка Transport, функция будет видеть только старые значения состояния.
// Решения:
// Refs: Используйте useRef для хранения актуальной сетки (grid), к которой обращается Transport.
// Draw: Для обновления UI (подсветки шага) используйте Tone.Draw. Это синхронизирует визуальный рендер React с аудио-событием.
// javascript
// Tone.Transport.scheduleRepeat((time) => {
//   Tone.Draw.schedule(() => {
//     // Этот код выполнится синхронно со звуком для анимации UI
//     setCurrentStep(s => (s + 1) % 16);
//   }, time);
// }, "16n");
