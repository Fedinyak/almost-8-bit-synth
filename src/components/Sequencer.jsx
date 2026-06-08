import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ControlPanel from './Sequencer/Controls/ControlPanel';
import DrumGrid from './Sequencer/Drums/DrumGrid';
import PatternList from './Sequencer/Controls/PatternList';
import SynthGrid from './Sequencer/Synths/SynthGrid';
import WorkspaceInstrumentTabs from './Sequencer/Controls/WorkspaceInstrumentTabs'; // Новый импорт
import { setActiveTabByIndex } from '../slices/playerSlice';
import { useEngineInitialization } from '../hooks/useEngineInitialization';

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

  useEngineInitialization();

  return (
    <section className="sequencer">
      <h3>currentPlayPatternIndex {currentPlayPatternIndex}</h3>
      <ControlPanel />
      <PatternList />

      <WorkspaceInstrumentTabs
        tabs={tabs}
        activeTabIndex={activeTabIndex}
        onTabClick={(index) => dispatch(setActiveTabByIndex(index))}
      />

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
