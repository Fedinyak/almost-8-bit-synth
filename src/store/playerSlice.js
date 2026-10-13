import { createSlice } from '@reduxjs/toolkit';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';
import { SYNTH_LIST } from '../constants/constants';

const initialState = {
  bpm: SEQUENCER_CONFIG.DEFAULT_BPM,
  sequencerPlayState: 'stop',
  systemState: 'STOP_DEFAULT', // ЦЕНТРАЛЬНЫЙ ДЕТЕРМИНИРОВАННЫЙ АВТОМАТ ПЛЕЕРА
  isLooping: false,
  totalSteps: SEQUENCER_CONFIG.TOTAL_STEPS,
  sequencerStep: SEQUENCER_CONFIG.SEQUENCER_STEP,
  isFollowMode: true,
  patternCount: SEQUENCER_CONFIG.DEFAULT_PATTERN_COUNT,
  patternMaxCount: SEQUENCER_CONFIG.PATTERN_MAX_COUNT,
  currentPlayPatternIndex: 0,
  selectedPatternIndex: false,
  pendingPatternIndex: null,
  currentStep: 0,
  pendingDeletePatternIndex: null,
  pendingDeleteLast: false,
  tabs: ['drums', ...SYNTH_LIST],
  activeTabIndex: 0,
  activeSoundControlDrumTabIndex: 0,
  shouldRewindEngineOnPause: false,
  shouldDropPatternDataInstantly: false,
};

const safelyAdjustPlayBounds = (state) => {
  const lastValidIndex = Math.max(0, state.patternCount - 1);

  if (state.currentPlayPatternIndex >= state.patternCount) {
    state.currentPlayPatternIndex = lastValidIndex;
  }
  if (state.selectedPatternIndex >= state.patternCount) {
    state.selectedPatternIndex = lastValidIndex;
  }
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setBpm: (state, action) => {
      state.bpm = action.payload;
    },

    // КОМАНДЫ ДЛЯ СИСТЕМНОГО АВТОМАТА (ДЕТЕРМИНИРОВАННЫЕ ПЕРЕХОДЫ)
    setIsLoopingTrue: (state) => {
      state.isLooping = true;
      if (state.sequencerPlayState === 'start') {
        state.systemState = 'PLAY_QUANTIZED_LOOP_WAITING';
      } else {
        state.systemState = 'STOP_LOOP_LOCKED';
      }
    },

    setIsLoopingFalse: (state) => {
      state.isLooping = false;
      state.pendingPatternIndex = null;
      if (state.sequencerPlayState === 'start') {
        state.systemState = 'PLAY_FORWARD';
      } else {
        state.systemState = 'STOP_DEFAULT';
      }
    },

    setSequencerPlayState: (state, action) => {
      state.sequencerPlayState = action.payload;
      if (action.payload === 'start') {
        // Если запускаемся из залупанного в стопе состояния, сразу переходим в активную петлю
        if (state.systemState === 'STOP_LOOP_LOCKED') {
          state.systemState = 'PLAY_LOOP_ACTIVE';
        } else {
          state.systemState = 'PLAY_FORWARD';
        }
      } else if (action.payload === 'stop') {
        state.pendingPatternIndex = null;
        state.systemState = 'STOP_DEFAULT';
      }
    },

    setPendingPattern: (state, action) => {
      state.pendingPatternIndex = action.payload;
      if (state.sequencerPlayState === 'start') {
        if (state.isLooping) {
          state.systemState = 'PLAY_QUANTIZED_LOOP_WAITING';
        } else {
          state.systemState = 'PLAY_QUANTIZED_JUMP_WAITING';
        }
      }
    },

    clearPendingPattern: (state) => {
      state.pendingPatternIndex = null;
      if (state.sequencerPlayState === 'start') {
        if (state.isLooping) {
          state.systemState = 'PLAY_LOOP_ACTIVE';
        } else {
          state.systemState = 'PLAY_FORWARD';
        }
      }
    },

    setCurrentPlayPatternIndex: (state, action) => {
      state.currentPlayPatternIndex = action.payload;
      // Звуковой движок дошел до границы такта и переключил трек
      if (state.pendingPatternIndex === action.payload) {
        state.pendingPatternIndex = null;
        if (state.isLooping) {
          state.systemState = 'PLAY_LOOP_ACTIVE';
        } else {
          state.systemState = 'PLAY_FORWARD';
        }
      }
    },

    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    setSelectedPatternIndex: (state, action) => {
      state.selectedPatternIndex = action.payload;
    },
    setFollowModeTrue: (state) => {
      state.isFollowMode = true;
    },
    setFollowModeFalse: (state) => {
      state.isFollowMode = false;
    },
    incrementPatternCount: (state) => {
      if (state.patternCount < state.patternMaxCount) {
        state.patternCount += 1;
      }
    },
    scheduleDeletePattern: (state, action) => {
      state.pendingDeletePatternIndex = action.payload;
    },
    applyDeletePatternCount: (state) => {
      if (state.pendingDeletePatternIndex !== null) {
        state.patternCount -= 1;
        safelyAdjustPlayBounds(state);
        state.pendingDeletePatternIndex = null;
      }
    },
    decrementPatternCountSync: (state) => {
      if (state.patternCount > 1) {
        state.patternCount -= 1;
        safelyAdjustPlayBounds(state);
      }
    },
    scheduleDeleteLastPattern: (state) => {
      if (state.patternCount > 1) {
        state.pendingDeleteLast = true;
      }
    },
    clearPendingDeleteLastPattern: (state) => {
      state.pendingDeleteLast = false;
    },
    setActiveTabByIndex: (state, action) => {
      state.activeTabIndex = action.payload;
    },
    setActiveSoundControlDrumTabIndex: (state, action) => {
      state.activeSoundControlDrumTabIndex = action.payload;
    },
    requestRemoveLastPattern: (state) => {
      if (state.patternCount <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT) return;
      const lastPatternIndex = state.patternCount - 1;

      if (state.sequencerPlayState === 'stop') {
        state.patternCount -= 1;
        safelyAdjustPlayBounds(state);
        state.shouldDropPatternDataInstantly = true;
        return;
      }

      if (state.isLooping) {
        state.pendingDeleteLast = true;
        return;
      }

      if (state.sequencerPlayState === 'pause') {
        if (state.currentPlayPatternIndex === lastPatternIndex) {
          state.currentPlayPatternIndex =
            SEQUENCER_CONFIG.INITIAL_PATTERN_INDEX;
          state.shouldRewindEngineOnPause = true;
        }
        state.patternCount -= 1;
        safelyAdjustPlayBounds(state);
        state.shouldDropPatternDataInstantly = true;
        return;
      }

      if (state.sequencerPlayState === 'start') {
        if (state.currentPlayPatternIndex === lastPatternIndex) {
          state.pendingDeleteLast = true;
        } else {
          state.patternCount -= 1;
          safelyAdjustPlayBounds(state);
          state.shouldDropPatternDataInstantly = true;
        }
      }
    },
    clearEngineControlSignals: (state) => {
      state.shouldRewindEngineOnPause = false;
      state.shouldDropPatternDataInstantly = false;
    },
  },
});

export const {
  setBpm,
  setIsLoopingTrue,
  setIsLoopingFalse,
  setSequencerPlayState,
  setCurrentStep,
  setCurrentPlayPatternIndex,
  setSelectedPatternIndex,
  setFollowModeTrue,
  setFollowModeFalse,
  setPendingPattern,
  clearPendingPattern,
  incrementPatternCount,
  scheduleDeletePattern,
  applyDeletePatternCount,
  decrementPatternCountSync,
  scheduleDeleteLastPattern,
  clearPendingDeleteLastPattern,
  setActiveTabByIndex,
  setActiveSoundControlDrumTabIndex,
  requestRemoveLastPattern,
  clearEngineControlSignals,
} = playerSlice.actions;

export default playerSlice.reducer;
