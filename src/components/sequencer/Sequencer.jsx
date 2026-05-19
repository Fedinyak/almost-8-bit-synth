import { useSelector } from 'react-redux';
import getNote from '../../utility/getNote';
import Cell from './Cell';
import TimerTransport from '../../utility/scheduler';
import SequencerControlPanel from './SequencerControlPanel';
import StepIndicator from './StepIndicator';
import noteAndKeyMap from '../../constants/noteAndKeyMap';
// import SequencerGrid from "./-SequencerGrid";
import SequencerDrumGrid from './SequencerDrumGrid';
import { SYNTH_LIST } from '../../constants/constants';
import PatternList from './PatternsList';
// import BpmVisualizer from "./BpmVisualizer";

const Sequencer = () => {
  const octave = useSelector((state) => state.note.octave);
  const currentPlayPatternIndex = useSelector(
    (state) => state.sequencer.currentPlayPatternIndex,
  );
  const synthData = useSelector((state) => state.sequencer.synthData);
  // const synthList = useSelector(state => state.sequencer.synthList);
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

  const isFollowMode = useSelector((state) => state.sequencer.isFollowMode);

  // const currentPlayPattern = useSelector(
  //   (state) => state.sequencer.currentPlayPatternIndex,
  // );
  const selectedPatternIndex = useSelector(
    (state) => state.sequencer.selectedPatternIndex,
  );

  const activeVisualPattern = isFollowMode
    ? currentPlayPatternIndex
    : selectedPatternIndex;

  return (
    <section className="sequencer">
      <h3>currentPlayPatternIndex {currentPlayPatternIndex}</h3>
      <SequencerControlPanel />
      <TimerTransport />
      <PatternList />
      <SequencerDrumGrid />
      <div className="sequencer-note-title">
        {keyboardLetter.map((letter) => {
          return (
            <p className="sequencer-note-title-item" key={letter}>
              {getNote(letter, octave, noteMap, octaveMap)}
            </p>
          );
        })}
      </div>
      {SYNTH_LIST.map((instrument) => {
        return (
          <>
            <div>{instrument}</div>
            <div className="sequencer-cells">
              {synthData[instrument].patterns[activeVisualPattern].map(
                (_, stepIndex) => {
                  return (
                    <div
                      className="sequencer-cells-row"
                      key={`${stepIndex}-${instrument}`}
                    >
                      <StepIndicator
                        key={`${stepIndex}-step-${instrument}`}
                        stepIndex={stepIndex}
                      />
                      {keyboardLetter.map((letter) => {
                        return (
                          <Cell
                            className="sequencer-cell"
                            key={`${instrument}-${letter}-${stepIndex}-${octave}`}
                            instrument={instrument}
                            note={getNote(letter, octave, noteMap, octaveMap)}
                            sequencerActiveNote={
                              synthData[instrument].patterns[
                                activeVisualPattern
                              ][stepIndex]
                            }
                            patternIndex={activeVisualPattern}
                            step={stepIndex}
                          />
                        );
                      })}
                      <br />
                    </div>
                  );
                },
              )}
            </div>
          </>
        );
      })}
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
