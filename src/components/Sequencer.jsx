import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TimerTransport from './Sequencer/Controls/TimerTransport';
import ControlPanel from './Sequencer/Controls/ControlPanel';
import DrumGrid from './Sequencer/Drums/DrumGrid';
import PatternList from './Sequencer/Controls/PatternsList';
import SynthGrid from './Sequencer/Synths/SynthGrid';
import { setActiveTabByIndex } from '../slices/playerSlice';

const Sequencer = () => {
  const dispatch = useDispatch();

  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );

  const isFollowMode = useSelector((state) => state.player.isFollowMode);

  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );

  const tabs = useSelector((state) => state.player.tabs || []);
  const activeTabIndex = useSelector((state) => state.player.activeTabIndex);

  const activeTabName = tabs[activeTabIndex];

  const activeVisualPattern = isFollowMode
    ? currentPlayPatternIndex
    : selectedPatternIndex;

  return (
    <section className="sequencer">
      <h3>currentPlayPatternIndex {currentPlayPatternIndex}</h3>

      <div className="workspace-tabs">
        {tabs.map((tabName, index) => (
          <button
            key={tabName}
            disabled={activeTabIndex === index}
            onClick={() => dispatch(setActiveTabByIndex(index))}
          >
            {tabName.toUpperCase()}
          </button>
        ))}
      </div>

      <ControlPanel />
      <TimerTransport />
      <PatternList />

      {activeTabName === 'drums' && <DrumGrid />}
      {activeTabName !== 'drums' && (
        <SynthGrid
          synthName={activeTabName}
          activeVisualPattern={activeVisualPattern}
        />
      )}
    </section>
  );
};

export default Sequencer;
