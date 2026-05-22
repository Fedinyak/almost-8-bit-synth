import { useSelector } from 'react-redux';
import TimerTransport from './TimerTransport';
import SequencerControlPanel from './SequencerControlPanel';
import SequencerDrumGrid from './SequencerDrumGrid';
import PatternList from './PatternsList';
import SynthGrid from './SynthGrid';

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
      <SequencerControlPanel />
      <TimerTransport />
      <PatternList />
      <SequencerDrumGrid />
      <SynthGrid activeVisualPattern={activeVisualPattern} />
    </section>
  );
};

export default Sequencer;
