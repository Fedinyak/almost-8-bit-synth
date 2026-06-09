import React from 'react';
import { useSelector } from 'react-redux';
import getNote from '../../../utility/getNote';
import noteAndKeyMap from '../../../constants/noteAndKeyMap';
import SynthRow from './SynthRow';
import WaveMonitor from '../../visualizers/WaveMonitor';
import OctaveSelector from './OctaveSelector';
import Keyboard from './keyboard/Keyboard';
import SoundEnginePanel from '../../synthesis/SynthesisPanel';

const SynthGrid = ({ activeVisualPattern, synthName }) => {
  const octave = useSelector((state) => state.note.octave);
  const synthData = useSelector((state) => state.patterns.synthData);
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

  if (!synthName) return null;

  return (
    <>
      <OctaveSelector />
      <div className="sequencer-note-title">
        {keyboardLetter.map((letter) => {
          return (
            <p className="sequencer-note-title-item" key={letter}>
              {getNote(letter, octave, noteMap, octaveMap)}
            </p>
          );
        })}
      </div>

      <React.Fragment key={synthName}>
        <div>{synthName} GRID:</div>

        {/* <WaveMonitor synthName={synthName} /> */}

        <div className="sequencer-cells">
          <SynthRow
            instrument={synthName}
            activeVisualPattern={activeVisualPattern}
            octave={octave}
            synthData={synthData}
          />
        </div>

        {/* Внедряем клавиатуру в грид и явно скармливаем ей имя текущего синтезатора */}
        <Keyboard activeInstrument={synthName} />

        <SoundEnginePanel synthName={synthName} />
      </React.Fragment>
    </>
  );
};

export default SynthGrid;
