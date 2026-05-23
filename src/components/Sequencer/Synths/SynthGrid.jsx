import { useSelector } from 'react-redux';
import getNote from '../../../utility/getNote';
import noteAndKeyMap from '../../../constants/noteAndKeyMap';
import { SYNTH_LIST } from '../../../constants/constants';
import SynthRow from './SynthRow';

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
              <SynthRow
                key={instrument}
                instrument={instrument}
                activeVisualPattern={activeVisualPattern}
                octave={octave}
                synthData={synthData}
              />
            </div>
          </>
        );
      })}
    </>
  );
};

export default SynthGrid;
