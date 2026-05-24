import getNote from '../../../utility/getNote';
import Cell from './Cell';
import StepIndicator from '../Controls/StepIndicator';
import noteAndKeyMap from '../../../constants/noteAndKeyMap';

const SynthRow = ({ instrument, activeVisualPattern, octave, synthData }) => {
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

  const currentPatternSteps =
    synthData?.[instrument]?.patterns?.[activeVisualPattern] || [];

  return currentPatternSteps.map((_, stepIndex) => {
    return (
      <div className="sequencer-cells-row" key={`${stepIndex}-${instrument}`}>
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
                synthData?.[instrument]?.patterns?.[activeVisualPattern]?.[
                  stepIndex
                ]
              }
              patternIndex={activeVisualPattern}
              step={stepIndex}
            />
          );
        })}
        <br />
      </div>
    );
  });
};

export default SynthRow;
