import { setEnginePosition } from './audioEngineCore';
import { STEPS_IN_MEASURE } from '../../constants/constants';
import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';
import { backupAndDropPatternData } from '../../store/patternsSlice';
// Измени старый импорт из playerSlice на новый адрес из audioEngineConfig:
import {
  PATTERN_ACTION_TYPES,
  PLAYBACK_STATES,
} from '../../constants/audioEngineConfig';

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
} from '../../store/playerSlice';

const isPlayState = (state) => state === PLAYBACK_STATES.START;
const isStopState = (state) => state === PLAYBACK_STATES.STOP;
const isMinPatternLimit = (count) =>
  count <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT;
const hasSignalsToClear = (hasData, needsRewind) => hasData || needsRewind;

export const executePatternPlaybackTrigger =
  (index) => (dispatch, getState) => {
    const { player } = getState();

    if (isPlayState(player.sequencerPlayState)) {
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingFalse());
      return;
    }

    if (isStopState(player.sequencerPlayState)) {
      setEnginePosition(index);
      dispatch(setCurrentPlayPatternIndex(index));
      dispatch(setCurrentStep(index * STEPS_IN_MEASURE));
      dispatch(setIsLoopingFalse());
      dispatch(setSequencerPlayState(PLAYBACK_STATES.START));
    }
  };

export const executeRemoveLastPatternRequest = () => (dispatch, getState) => {
  const { player: initialPlayer } = getState();

  if (isMinPatternLimit(initialPlayer.patternCount)) return;

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

  if (hasSignalsToClear(hasDataToDrop, needsEngineRewind)) {
    dispatch(clearEngineControlSignals());
  }
};

export const dispatchPatternAction = (type, index) => (dispatch) => {
  switch (type) {
    case PATTERN_ACTION_TYPES.PLAY:
      dispatch(executePatternPlaybackTrigger(index));
      break;
    case PATTERN_ACTION_TYPES.LOOP:
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingTrue());
      break;
    case PATTERN_ACTION_TYPES.SELECT:
      dispatch(setSelectedPatternIndex(index));
      dispatch(setFollowModeFalse());
      break;
    case PATTERN_ACTION_TYPES.TOGGLE_FOLLOW:
      dispatch(setFollowModeTrue());
      dispatch(setSelectedPatternIndex(false));
      break;
    default:
      break;
  }
};
