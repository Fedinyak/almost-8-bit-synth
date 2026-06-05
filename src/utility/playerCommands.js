import { setEnginePosition } from './audioEngineCore';
import { STEPS_IN_MEASURE } from '../constants/constants';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';
import { backupAndDropPatternData } from '../slices/patternsSlice';
import {
  setPendingPattern,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  setSequencerPlayState,
  decrementPatternCountSync,
  scheduleDeleteLastPattern,
  setSelectedPatternIndex,
  setFollowModeFalse,
  setFollowModeTrue,
} from '../slices/playerSlice';

export const executePatternPlaybackTrigger =
  (index) => (dispatch, getState) => {
    const { player } = getState();
    const { sequencerPlayState } = player;

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

export const executeRemoveLastPatternRequest = () => (dispatch, getState) => {
  const { player } = getState();
  const {
    patternCount,
    sequencerPlayState,
    isLooping,
    currentPlayPatternIndex,
  } = player;

  // Prevent track sequence array from dropping below minimum structural size limit
  if (patternCount <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT) return;
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
    // If pausing exactly on the targeted deleted item layout edge, safely rewind engine physical timeline state back to zero coordinates
    if (currentPlayPatternIndex === lastPatternIndex) {
      setEnginePosition(SEQUENCER_CONFIG.TRACK_START_POSITION);
      dispatch(
        setCurrentPlayPatternIndex(SEQUENCER_CONFIG.INITIAL_PATTERN_INDEX),
      );
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

export const dispatchPatternAction = (type, index) => (dispatch) => {
  switch (type) {
    case 'PLAY':
      dispatch(executePatternPlaybackTrigger(index));
      break;
    case 'LOOP':
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingTrue());
      break;
    case 'SELECT':
      dispatch(setSelectedPatternIndex(index));
      dispatch(setFollowModeFalse());
      break;
    case 'TOGGLE_FOLLOW':
      dispatch(setFollowModeTrue());
      dispatch(setSelectedPatternIndex(false));
      break;
    default:
      break;
  }
};
