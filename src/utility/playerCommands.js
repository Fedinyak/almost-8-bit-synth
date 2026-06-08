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
  setSelectedPatternIndex,
  setFollowModeFalse,
  setFollowModeTrue,
  requestRemoveLastPattern,
  clearEngineControlSignals,
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
  const { player: initialPlayer } = getState();

  if (initialPlayer.patternCount <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT) return;

  const lastPatternIndex = initialPlayer.patternCount - 1;

  dispatch(requestRemoveLastPattern());

  const updatedPlayer = getState().player;
  const hasDataToDrop = updatedPlayer.shouldDropPatternDataInstantly;
  const needsEngineRewind = updatedPlayer.shouldRewindEngineOnPause;

  if (hasDataToDrop) {
    dispatch(backupAndDropPatternData(lastPatternIndex));
  }

  if (needsEngineRewind) {
    setEnginePosition(SEQUENCER_CONFIG.TRACK_START_POSITION);
  }

  if (hasDataToDrop || needsEngineRewind) {
    dispatch(clearEngineControlSignals());
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
