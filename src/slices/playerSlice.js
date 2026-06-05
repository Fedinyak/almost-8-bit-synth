import { createSlice } from '@reduxjs/toolkit';
import { SEQUENCER_CONFIG } from '../constants/sequencerConfig';
import { SYNTH_LIST } from '../constants/constants';

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
  tabs: ['drums', ...SYNTH_LIST],
  activeTabIndex: 0,
  activeSoundControlDrumTabIndex: 0,
  // Hardware orchestration control flags
  shouldRewindEngineOnPause: false,
  shouldDropPatternDataInstantly: false, // Flag signal to authorize safe data drop mutations
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
    // CENTRALIZED STATE REDUCER: Processes truncation limits and sync flags deterministically
    requestRemoveLastPattern: (state) => {
      if (state.patternCount <= SEQUENCER_CONFIG.MIN_PATTERN_COUNT) return;
      const lastPatternIndex = state.patternCount - 1;

      // Stop Mode: Authorize immediate data drop and reduce layout bounds instantly
      if (state.sequencerPlayState === 'stop') {
        state.patternCount -= 1;
        safelyAdjustPlayBounds(state);
        state.shouldDropPatternDataInstantly = true;
        return;
      }

      // Global Loop Mode: Always defer truncation to the scheduled measure edge quantization handler
      if (state.isLooping) {
        state.pendingDeleteLast = true;
        return;
      }

      // Pause Mode: Reset timeline coordinates if idling exactly on the deleted partition boundary edge
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

      // Start Play Mode: Truncate instantly only if the playback engine cursor is riding another measure track partition
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
  requestRemoveLastPattern, // EXPORTED
  clearEngineControlSignals, // EXPORTED
} = playerSlice.actions;

export default playerSlice.reducer;
