// components/PatternList/PatternList.js
import { useDispatch, useSelector } from 'react-redux';
import {
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
  incrementPatternCount,
} from '../../../slices/playerSlice';
import { addPatternData } from '../../../slices/patternsSlice';
import {
  executePatternPlaybackTrigger,
  executeRemoveLastPatternRequest,
} from '../../../slices/playerOperations'; // IMPORT: Streamlined operations bundle hookup
import { getPatternVisualFlags } from '../../../utility/patternStatusSelectors';
import { PatternItem } from './PatternItem';
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

  const handleAddPattern = () => {
    dispatch(addPatternData());
    dispatch(incrementPatternCount());
  };

  const handleRemoveLastPattern = () => {
    // Pipeline trigger is now entirely offloaded to the decoupled operation thunk
    dispatch(executeRemoveLastPatternRequest());
  };

  const handlePlayPatternIndex = (index) => {
    // Pipeline trigger is now entirely offloaded to the decoupled operation thunk
    dispatch(executePatternPlaybackTrigger(index));
  };

  return (
    <div className="pattern-list-container">
      <div
        className="pattern-controls"
        style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
      >
        <button onClick={handleAddPattern} className="add-pattern-global-btn">
          + Add pattern
        </button>
        <button
          onClick={handleRemoveLastPattern}
          className="remove-pattern-global-btn"
        >
          - Delete pattern
        </button>
      </div>

      <ul className="patten-list">
        {patternCountIndex.map((index) => {
          const visualFlags = getPatternVisualFlags({
            index,
            sequencerPlayState,
            pendingPatternIndex,
            currentPlayPatternIndex,
            isLooping,
          });

          return (
            <PatternItem
              key={index}
              index={index}
              visualFlags={visualFlags}
              isSelected={selectedPatternIndex === index}
              isFollowMode={isFollowMode}
              onPlayClick={handlePlayPatternIndex}
              onLoopClick={(idx) => {
                dispatch(setPendingPattern(idx));
                dispatch(setIsLoopingTrue());
              }}
              onSelectClick={(idx) => {
                dispatch(setSelectedPatternIndex(idx));
                dispatch(setFollowModeFalse());
              }}
              onFollowClick={() => {
                dispatch(setFollowModeTrue());
                dispatch(setSelectedPatternIndex(false));
              }}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default PatternList;
