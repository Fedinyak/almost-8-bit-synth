import { createSlice } from '@reduxjs/toolkit';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';

const initialState = {
  bpm: SEQUENCER_CONFIG.DEFAULT_BPM,
  sequencerPlayState: 'stop',
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
    setIsLoopingTrue: (state) => {
      state.isLooping = true;
    },
    setIsLoopingFalse: (state) => {
      state.isLooping = false;
    },
    setSequencerPlayState: (state, action) => {
      state.sequencerPlayState = action.payload;
    },
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    setCurrentPlayPatternIndex: (state, action) => {
      state.currentPlayPatternIndex = action.payload;
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
    setPendingPattern: (state, action) => {
      state.pendingPatternIndex = action.payload;
    },
    clearPendingPattern: (state) => {
      state.pendingPatternIndex = null;
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
    // НОВЫЕ РЕДЬЮСЕРЫ ДЛЯ УПРАВЛЕНИЯ ДЛИННОЙ ТРЕКА И КВАНТОВАНИЕМ
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
} = playerSlice.actions;

export default playerSlice.reducer;
