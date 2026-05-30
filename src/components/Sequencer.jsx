import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TimerTransport from './Sequencer/Controls/TimerTransport';
import ControlPanel from './Sequencer/Controls/ControlPanel';
import DrumGrid from './Sequencer/Drums/DrumGrid';
import PatternList from './Sequencer/Controls/PatternsList';
import SynthGrid from './Sequencer/Synths/SynthGrid';
import { SYNTH_LIST } from '../constants/constants';
import { setActiveTab } from '../slices/playerSlice';

const Sequencer = () => {
  const dispatch = useDispatch();

  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );

  const isFollowMode = useSelector((state) => state.player.isFollowMode);

  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );

  const activeTab = useSelector((state) => state.player.activeTab);

  const activeVisualPattern = isFollowMode
    ? currentPlayPatternIndex
    : selectedPatternIndex;

  return (
    <section className="sequencer">
      <h3>currentPlayPatternIndex {currentPlayPatternIndex}</h3>

      <div className="workspace-tabs">
        <button
          disabled={activeTab === 'drums'}
          onClick={() => dispatch(setActiveTab('drums'))}
        >
          DRUMS
        </button>

        {SYNTH_LIST.map((synthName) => (
          <button
            key={synthName}
            disabled={activeTab === synthName}
            onClick={() => dispatch(setActiveTab(synthName))}
          >
            {synthName.toUpperCase()}
          </button>
        ))}
      </div>

      <ControlPanel />
      <TimerTransport />
      <PatternList />

      {activeTab === 'drums' && <DrumGrid />}
      {SYNTH_LIST.includes(activeTab) && (
        <SynthGrid
          synthName={activeTab}
          activeVisualPattern={activeVisualPattern}
        />
      )}
    </section>
  );
};

export default Sequencer;
