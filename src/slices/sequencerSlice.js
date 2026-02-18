import { createSlice } from "@reduxjs/toolkit";
// import { synth } from "../utility/playSound";

export const NOTES_COUNT = 72; // C1-B6
export const STEPS_PER_PAGE = 32;
export const TOTAL_STEPS = 256;
export const SEQUENCER_STEP = 16;
export const PATTERN_MAX_COUNT = 16;

const createGrid = () => {
  return Array(NOTES_COUNT)
    .fill(null)
    .map(() => Array(TOTAL_STEPS).fill(0));
};

const initialState = {
  bpm: 120,
  sequencerPlayState: "stop",
  grid: createGrid(),
  totalSteps: TOTAL_STEPS,
  sequencerStep: SEQUENCER_STEP,
  patternMaxCount: PATTERN_MAX_COUNT,
  currentPatternIndex: 0,
  // patternsSequence: [0, 1],
  currentStep: 0,
  viewPage: 0,
  visibleNotesCount: 24,
  // instrumentsList: ["synth1", "synth2"],
  instrumentsList: ["synth1", "synth2"],
  instrumentsData: {
    synth1: {
      // instrument: "synth1",
      // instrumentId: 1,
      type: "synth",
      patterns: [
        [
          // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },
          { time: "0:0:0", note: "C4", duration: "8n" },
          { time: "0:0:1", note: null },
          { time: "0:0:2", note: null },
          { time: "0:0:3", note: null },

          { time: "0:1:0", note: "C4", duration: "8n" },
          { time: "0:1:1", note: null },
          { time: "0:1:2", note: null },
          { time: "0:1:3", note: null },

          { time: "0:2:0", note: "C4", duration: "8n" },
          { time: "0:2:1", note: null },
          { time: "0:2:2", note: null },
          { time: "0:2:3", note: null },

          { time: "0:3:0", note: "E4", duration: "8n" },
          { time: "0:3:1", note: null },
          { time: "0:3:2", note: null },
          { time: "0:3:3", note: null },
        ],
        [
          { time: "0:0:0", note: "C2", duration: "8n" },
          { time: "0:0:1", note: null },
          { time: "0:0:2", note: null },
          { time: "0:0:3", note: null },

          { time: "0:1:0", note: "C2", duration: "8n" },
          { time: "0:1:1", note: null },
          { time: "0:1:2", note: null },
          { time: "0:1:3", note: null },

          { time: "0:2:0", note: "C2", duration: "8n" },
          { time: "0:2:1", note: null },
          { time: "0:2:2", note: null },
          { time: "0:2:3", note: null },

          { time: "0:3:0", note: "E2", duration: "8n" },
          { time: "0:3:1", note: null },
          { time: "0:3:2", note: null },
          { time: "0:3:3", note: null },
        ],
      ],
      sequencerNoteGrid: [
        // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },

        { time: "0:0:0", note: "C4", duration: "8n" },
        { time: "0:0:1", note: null },
        { time: "0:0:2", note: null },
        { time: "0:0:3", note: null },

        { time: "0:1:0", note: "C4", duration: "8n" },
        { time: "0:1:1", note: null },
        { time: "0:1:2", note: null },
        { time: "0:1:3", note: null },

        { time: "0:2:0", note: "C4", duration: "8n" },
        { time: "0:2:1", note: null },
        { time: "0:2:2", note: null },
        { time: "0:2:3", note: null },

        { time: "0:3:0", note: "E4", duration: "8n" },
        { time: "0:3:1", note: null },
        { time: "0:3:2", note: null },
        { time: "0:3:3", note: null },
      ],
    },
    synth2: {
      // instrument: "synth2",
      // instrumentId: 2,
      type: "synth",
      patterns: [
        [
          { time: "0:0:0", note: "C4", duration: "8n" },
          { time: "0:0:1", note: null },
          { time: "0:0:2", note: null },
          { time: "0:0:3", note: null },

          { time: "0:1:0", note: "C4", duration: "8n" },
          { time: "0:1:1", note: null },
          { time: "0:1:2", note: null },
          { time: "0:1:3", note: null },

          { time: "0:2:0", note: "C4", duration: "8n" },
          { time: "0:2:1", note: null },
          { time: "0:2:2", note: null },
          { time: "0:2:3", note: null },

          { time: "0:3:0", note: "E4", duration: "8n" },
          { time: "0:3:1", note: null },
          { time: "0:3:2", note: null },
          { time: "0:3:3", note: null },
        ],
        [
          { time: "0:0:0", note: "C1", duration: "8n" },
          { time: "0:0:1", note: null },
          { time: "0:0:2", note: null },
          { time: "0:0:3", note: null },

          { time: "0:1:0", note: "C1", duration: "8n" },
          { time: "0:1:1", note: null },
          { time: "0:1:2", note: null },
          { time: "0:1:3", note: null },

          { time: "0:2:0", note: "C1", duration: "8n" },
          { time: "0:2:1", note: null },
          { time: "0:2:2", note: null },
          { time: "0:2:3", note: null },

          { time: "0:3:0", note: "E1", duration: "8n" },
          { time: "0:3:1", note: null },
          { time: "0:3:2", note: null },
          { time: "0:3:3", note: null },
        ],
      ],
      // sequencerNoteGrid: [
      //   // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },

      //   { time: "0:0:0", note: null },
      //   { time: "0:0:1", note: null },
      //   { time: "0:0:2", note: "E4", duration: "8n" },
      //   { time: "0:0:3", note: null },

      //   { time: "0:1:0", note: null },
      //   { time: "0:1:1", note: null },
      //   { time: "0:1:2", note: null },
      //   { time: "0:1:3", note: null },

      //   { time: "0:2:0", note: null },
      //   { time: "0:2:1", note: null },
      //   { time: "0:2:2", note: "E4", duration: "8n" },
      //   { time: "0:2:3", note: null },

      //   { time: "0:3:0", note: "C4", duration: "8n" },
      //   { time: "0:3:1", note: null },
      //   { time: "0:3:2", note: null },
      //   { time: "0:3:3", note: null },
      // ],
    },
  },
  drums: {
    type: "drums",
    drumKit: [
      "kick",
      "snare",
      "hiHatClose",
      "hiHatOpen",
      "crash",
      "ride",
      "tom",
    ],
    // sequencerNoteGrid: [
    //   // { time: "0:0:0", note: "C1", duration: "8n" },
    //   { time: "0:0:0", note: null },
    //   { time: "0:0:1", note: null },
    //   { time: "0:0:2", note: null },
    //   { time: "0:0:3", note: null },

    //   // { time: "0:1:0", note: "D1", duration: "8n" },
    //   { time: "0:1:0", note: null },
    //   { time: "0:1:1", note: null },
    //   { time: "0:1:2", note: null },
    //   { time: "0:1:3", note: null },

    //   // { time: "0:2:0", note: "C1", duration: "8n" },
    //   { time: "0:2:0", note: null },
    //   { time: "0:2:1", note: null },
    //   { time: "0:2:2", note: null },
    //   // { time: "0:2:3", note: "C1", duration: "8n" },
    //   { time: "0:2:3", note: null },

    //   // { time: "0:3:0", note: "D1", duration: "8n" },
    //   { time: "0:3:0", note: null },
    //   // { time: "0:3:1", note: "C1", duration: "8n" },
    //   { time: "0:3:1", note: null },
    //   { time: "0:3:2", note: null },
    //   { time: "0:3:3", note: null },
    // ],
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
    ],
    tracks: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hiHat: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
    },
  },
};

export const sequencerSlice = createSlice({
  name: "sequencer",
  initialState,
  reducers: {
    setBpm: (state, action) => {
      state.bpm = action.payload;
    },
    setSequencerPlayState: (state, action) => {
      console.log(action.payload);
      state.sequencerPlayState = action.payload;
    },
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    setCurrentPatternIndex: (state, action) => {
      state.currentPatternIndex = action.payload;
    },
    nextCurrentPatternIndex: state => {
      if (state.currentPatternIndex < state.instrumentsData.patterns.length) {
        state.currentPatternIndex += 1;
      } else {
        state.currentPatternIndex = 0;
      }
    },
    setSequencerInstrumentNote: (state, action) => {
      const { instrument, step, note, patternIndex } = action.payload;
      state.instrumentsData[instrument].patterns[patternIndex][step].note =
        note;
      state.instrumentsData[instrument].patterns[patternIndex][step].duration =
        "8n";
      console.log(
        state.instrumentsData[instrument].patterns[patternIndex][step].note,
        "state.instrumentsData[instrument].patterns[patternIndex][step]",
      );
    },
    toggleDrumStep: (state, action) => {
      const { drumName, stepIndex, patternIndex } = action.payload;
      const currentValue =
        state.drums.patterns[patternIndex][drumName][stepIndex];
      state.drums.patterns[patternIndex][drumName][stepIndex] =
        currentValue === 1 ? 0 : 1;
    },
    // toggleStep: (state, action) => {
    //   console.log(action.payload, "toggleStep");
    //   const { noteIndex, stepIndex } = action.payload;
    //   const currentValue = state.grid[noteIndex][stepIndex];
    //   state.grid[noteIndex][stepIndex] = currentValue === 0 ? 1 : 0;
    // },
    resetGrid: state => {
      state.grid = createGrid();
    },
  },
});

export const {
  setBpm,
  setSequencerPlayState,
  setCurrentStep,
  setSequencerInstrumentNote,
  toggleDrumStep,
  // toggleStep,
  resetGrid,
} = sequencerSlice.actions;

export default sequencerSlice.reducer;
