import { useSelector } from 'react-redux';
import getNote from '../../utility/getNote';
import Cell from './Cell';
import StepIndicator from './StepIndicator';
import noteAndKeyMap from '../../constants/noteAndKeyMap';
import { SYNTH_LIST } from '../../constants/constants';

const SynthGrid = ({ activeVisualPattern }) => {
  const octave = useSelector((state) => state.note.octave);
  const synthData = useSelector((state) => state.patterns.synthData);
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

  return (
    <>
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
    </>
  );
};

export default SynthGrid;
