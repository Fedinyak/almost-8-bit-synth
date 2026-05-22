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
} = playerSlice.actions;

export default playerSlice.reducer;
