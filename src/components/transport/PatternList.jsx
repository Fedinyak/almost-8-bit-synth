import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setIsLoopingTrue,
  setIsLoopingFalse,
  setSelectedPatternIndex,
  setPendingPattern,
  setCurrentPlayPatternIndex,
  setSequencerPlayState,
  setFollowModeTrue,
  setFollowModeFalse,
} from '../../store/playerSlice';
import { getPatternVisualFlags } from '../../utils/patternStatusSelectors';
import { getNativeContext } from '../../audio/core/nativeContext';
import { scheduler } from '../../audio/core/scheduler';
import { PatternItem } from './PatternItem';
import { PatternControls } from './PatternControls';
import * as Tone from 'tone';
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

  const patternCountIndex = Array.from(
    { length: patternCount || 0 },
    (_, i) => i,
  );

  const handlePatternAction = async (type, index) => {
    const isPlaying = sequencerPlayState === 'start';

    switch (type) {
      case 'PLAY':
        if (isPlaying) {
          dispatch(setIsLoopingFalse());
          dispatch(setPendingPattern(index));
        } else {
          const audioContext = getNativeContext();
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch((err) => console.error(err));
          }
          if (Tone && typeof Tone.start === 'function') {
            await Tone.start();
          }

          scheduler.updateState('start', index);
          dispatch(setCurrentPlayPatternIndex(index));
          dispatch(setSelectedPatternIndex(index));
          dispatch(setSequencerPlayState('start'));
        }
        break;

      case 'LOOP':
        if (isLooping && selectedPatternIndex === index) {
          dispatch(setIsLoopingFalse());
          dispatch(setPendingPattern(null));
        } else {
          dispatch(setIsLoopingTrue());

          if (isFollowMode) {
            dispatch(setSelectedPatternIndex(index));
          }

          if (isPlaying) {
            dispatch(setPendingPattern(index));
          } else {
            dispatch(setCurrentPlayPatternIndex(index));
          }
        }
        break;

      case 'SELECT':
        if (selectedPatternIndex === index && !isFollowMode) {
          dispatch(setFollowModeTrue());
        } else {
          dispatch(setSelectedPatternIndex(index));
          dispatch(setFollowModeFalse());
        }
        break;

      case 'TOGGLE_FOLLOW':
        if (isFollowMode) {
          dispatch(setFollowModeFalse());
        } else {
          dispatch(setFollowModeTrue());
        }
        break;

      default:
        break;
    }
  };

  return (
    <div className="pattern-list-container">
      <PatternControls />

      <ul className="patten-list">
        {patternCountIndex.map((idx) => {
          const flags = getPatternVisualFlags({
            index: idx,
            sequencerPlayState,
            pendingPatternIndex,
            currentPlayPatternIndex,
            isLooping,
            selectedPatternIndex,
            isFollowMode,
          });

          return (
            <PatternItem
              key={idx}
              index={idx}
              visualFlags={flags}
              isSelected={!isFollowMode && selectedPatternIndex === idx}
              isFollowMode={isFollowMode}
              onAction={handlePatternAction}
            />
          );
        })}
      </ul>
    </div>
  );
};

export default PatternList;
