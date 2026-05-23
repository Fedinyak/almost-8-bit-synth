import { useSelector } from 'react-redux';
import TimerTransport from './Sequencer/Controls/TimerTransport';
import ControlPanel from './Sequencer/Controls/ControlPanel';
import DrumGrid from './Sequencer/Drums/DrumGrid';
import PatternList from './Sequencer/Controls/PatternsList';
import SynthGrid from './Sequencer/Synths/SynthGrid';

const Sequencer = () => {
  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );

  const isFollowMode = useSelector((state) => state.player.isFollowMode);

  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );

  const activeVisualPattern = isFollowMode
    ? currentPlayPatternIndex
    : selectedPatternIndex;

  return (
    <section className="sequencer">
      <h3>currentPlayPatternIndex {currentPlayPatternIndex}</h3>
      <ControlPanel />
      <TimerTransport />
      <PatternList />
      <DrumGrid />
      <SynthGrid activeVisualPattern={activeVisualPattern} />
    </section>
  );
};

export default Sequencer;
