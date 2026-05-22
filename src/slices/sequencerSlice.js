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
  visibleNotesCount: SEQUENCER_CONFIG.VISIBLE_NOTES_COUNT,
  synthData: {
    synth1: {
      patterns: [
        [
          // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },
          { time: '0:0:0', note: 'C4', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C4', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C4', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E4', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C2', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C2', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C2', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E2', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C1', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C1', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C1', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E1', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
      ],
    },
    synth2: {
      patterns: [
        [
          { time: '0:0:0', note: 'C4', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C4', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C4', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E4', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C1', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C1', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C1', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E1', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C2', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C2', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C2', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E2', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
      ],
    },
  },
  drumKitList: [
    'kick',
    'snare',
    'hiHatClose',
    'hiHatOpen',
    'crash',
    'ride',
    'tom',
  ],
  drumsData: {
    patterns: [
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
      {
        kick: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
};

export const sequencerSlice = createSlice({
  name: 'sequencer',
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
    setSequencerInstrumentNote: (state, action) => {
      const { instrument, step, note, patternIndex } = action.payload;
      state.synthData[instrument].patterns[patternIndex][step].note = note;
      state.synthData[instrument].patterns[patternIndex][step].duration = '8n';
    },
    toggleDrumStep: (state, action) => {
      const { drumName, stepIndex, patternIndex } = action.payload;
      const currentValue =
        state.drumsData.patterns[patternIndex][drumName][stepIndex];
      state.drumsData.patterns[patternIndex][drumName][stepIndex] =
        currentValue === 1 ? 0 : 1;
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
  setSequencerInstrumentNote,
  toggleDrumStep,
  setCurrentPlayPatternIndex,
  setSelectedPatternIndex,
  setFollowModeTrue,
  setFollowModeFalse,
  setPendingPattern,
  clearPendingPattern,
} = sequencerSlice.actions;

export default sequencerSlice.reducer;
