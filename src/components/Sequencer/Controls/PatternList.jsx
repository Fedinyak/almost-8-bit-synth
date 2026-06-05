// components/PatternList/PatternList.js
import { useDispatch, useSelector } from 'react-redux';
import {
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
} from '../../../slices/playerSlice';
import { executePatternPlaybackTrigger } from '../../../utility/audioPlaybackActions';
import { getPatternVisualFlags } from '../../../utility/patternStatusSelectors';
import { PatternItem } from './PatternItem';
import { PatternControls } from './PatternControls'; // IMPORT: Hooked up the new decoupled controls panel
import './patternList.css'; // All @keyframes and layout classes go here

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

  const handlePlayPattern = (index) => {
    dispatch(executePatternPlaybackTrigger(index));
  };

  const handleLoopPattern = (index) => {
    dispatch(setPendingPattern(index));
    dispatch(setIsLoopingTrue());
  };

  const handleSelectPattern = (index) => {
    dispatch(setSelectedPatternIndex(index));
    dispatch(setFollowModeFalse());
  };

  const handleToggleFollowMode = () => {
    dispatch(setFollowModeTrue());
    dispatch(setSelectedPatternIndex(false));
  };

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
            onPlayClick={handlePlayPattern}
            onLoopClick={handleLoopPattern}
            onSelectClick={handleSelectPattern}
            onFollowClick={handleToggleFollowMode}
          />
        ))}
      </ul>
    </div>
  );
};

export default PatternList;
