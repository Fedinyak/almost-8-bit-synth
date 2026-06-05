import { setEnginePosition } from '../utility/audioEngineCore';
import { STEPS_IN_MEASURE } from '../constants/constants';
import { backupAndDropPatternData } from './patternsSlice';
import {
  setPendingPattern,
  setIsLoopingFalse,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  setSequencerPlayState,
  decrementPatternCountSync,
  scheduleDeleteLastPattern,
} from './playerSlice';

// SELF-DOCUMENTING THUNK OPERATIONS: Isolated pipeline orchestration layer
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
