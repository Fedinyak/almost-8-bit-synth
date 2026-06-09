import { useDispatch, useSelector } from 'react-redux';
import { dispatchPatternAction } from '../../audio/playback/audioPlaybackActions';
import { getPatternVisualFlags } from '../../utils/patternStatusSelectors';
import { PatternItem } from './PatternItem';
import { PatternControls } from './PatternControls';
import './patternList.css';

const PatternList = () => {
  const dispatch = useDispatch();

  const playerState = useSelector((state) => state.player);
  const {
    patternCount,
    pendingPatternIndex,
    currentPlayPatternIndex,
    sequencerPlayState,
    selectedPatternIndex,
    isFollowMode,
    isLooping,
  } = playerState;

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);

  return (
    <div className="pattern-list-container">
      {/* Structural layout block isolating core track timeline management actions */}
      <PatternControls />

      <ul className="patten-list">
        {patternCountIndex.map((index) => (
          <PatternItem
            key={index}
            index={index}
            visualFlags={getPatternVisualFlags({
              index,
              sequencerPlayState,
              pendingPatternIndex,
              currentPlayPatternIndex,
              isLooping,
            })}
            isSelected={selectedPatternIndex === index}
            isFollowMode={isFollowMode}
            // Streamlined action router forwarding events directly to the audio orchestration thunk layer
            onAction={(type, idx) => dispatch(dispatchPatternAction(type, idx))}
          />
        ))}
      </ul>
    </div>
  );
};

export default PatternList;
