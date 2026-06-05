// components/PatternList/PatternList.js
import { useDispatch, useSelector } from 'react-redux';
import {
  setCurrentPlayPatternIndex,
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
  setSequencerPlayState,
  incrementPatternCount,
  decrementPatternCountSync,
  scheduleDeleteLastPattern,
  setCurrentStep,
} from '../../../slices/playerSlice';
import {
  addPatternData,
  backupAndDropPatternData,
} from '../../../slices/patternsSlice';
import { setEnginePosition } from '../../../utility/audioEngineCore';
import { STEPS_IN_MEASURE } from '../../../constants/constants';
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
    if (patternCount <= 1) return;
    const lastPatternIndex = patternCount - 1;

    if (sequencerPlayState === 'stop') {
      dispatch(backupAndDropPatternData(lastPatternIndex));
      dispatch(decrementPatternCountSync());
      return;
    }
    if (isLooping) {
      dispatch(scheduleDeleteLastPattern());
      return;
    }
    if (sequencerPlayState === 'pause') {
      if (currentPlayPatternIndex === lastPatternIndex) {
        setEnginePosition(0);
        dispatch(setCurrentPlayPatternIndex(0));
      }
      dispatch(backupAndDropPatternData(lastPatternIndex));
      dispatch(decrementPatternCountSync());
      return;
    }
    if (sequencerPlayState === 'start') {
      if (currentPlayPatternIndex === lastPatternIndex) {
        dispatch(scheduleDeleteLastPattern());
      } else {
        dispatch(backupAndDropPatternData(lastPatternIndex));
        dispatch(decrementPatternCountSync());
      }
    }
  };

  const handlePlayPatternIndex = (index) => {
    if (sequencerPlayState === 'start') {
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingFalse());
    }
    if (sequencerPlayState === 'stop') {
      setEnginePosition(index);
      dispatch(setCurrentPlayPatternIndex(index));
      dispatch(setCurrentStep(index * STEPS_IN_MEASURE));
      dispatch(setIsLoopingFalse());
      dispatch(setSequencerPlayState('start'));
    }
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
