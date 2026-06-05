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
  requestRemoveLastPattern, // IMPORTED
  clearEngineControlSignals, // IMPORTED
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

// CLEAN PIEPLINE LAYER: Fully state-driven deterministic execution flow with hardware protection fences
export const executeRemoveLastPatternRequest = () => (dispatch, getState) => {
  const { player } = getState();

  if (player.patternCount <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT) return;
  const lastPatternIndex = player.patternCount - 1;

  // 1. Invoke centralized reducer logic to evaluate boundaries and arm signal flags safely
  dispatch(requestRemoveLastPattern());

  const updatedPlayer = getState().player;

  // 2. Safely drop pattern sequence data slice only when authorized by the state engine validation checkpoint
  if (updatedPlayer.shouldDropPatternDataInstantly) {
    dispatch(backupAndDropPatternData(lastPatternIndex));
  }

  // 3. Intercept physics engine signals to rewind transport positions when required
  if (updatedPlayer.shouldRewindEngineOnPause) {
    setEnginePosition(SEQUENCER_CONFIG.TRACK_START_POSITION);
  }

  // 4. Flush control state signals to prevent recurring execution loops
  if (
    updatedPlayer.shouldDropPatternDataInstantly ||
    updatedPlayer.shouldRewindEngineOnPause
  ) {
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
