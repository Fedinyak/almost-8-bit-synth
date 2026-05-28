import { useSelector } from 'react-redux';
import getNote from '../../../utility/getNote';
import noteAndKeyMap from '../../../constants/noteAndKeyMap';
import { SYNTH_LIST } from '../../../constants/constants';
import SynthRow from './SynthRow';
import WaveMonitor from '../../visualizers/WaveMonitor';
import React from 'react';
import SynthSoundPanel from '../Controls/SynthSoundPanel';

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
          <React.Fragment key={instrument}>
            <SynthSoundPanel synthName={instrument} />
            <div>{instrument}</div>
            <WaveMonitor synthName={instrument} />
            <div className="sequencer-cells">
              <SynthRow
                instrument={instrument}
                activeVisualPattern={activeVisualPattern}
                octave={octave}
                synthData={synthData}
              />
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default SynthGrid;
