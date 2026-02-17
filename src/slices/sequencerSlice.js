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
  currentPattern: 0,
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
      sequencerNoteGrid: [
        // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },

        { time: "0:0:0", note: null },
        { time: "0:0:1", note: null },
        { time: "0:0:2", note: "E4", duration: "8n" },
        { time: "0:0:3", note: null },

        { time: "0:1:0", note: null },
        { time: "0:1:1", note: null },
        { time: "0:1:2", note: null },
        { time: "0:1:3", note: null },

        { time: "0:2:0", note: null },
        { time: "0:2:1", note: null },
        { time: "0:2:2", note: "E4", duration: "8n" },
        { time: "0:2:3", note: null },

        { time: "0:3:0", note: "C4", duration: "8n" },
        { time: "0:3:1", note: null },
        { time: "0:3:2", note: null },
        { time: "0:3:3", note: null },
      ],
    },
  },
  drums: {
    type: "drums",
    drumKit: [
      "kick",
      "snare",
      "hiHatClose",
      // "hi-hat-open",
      // "crash",
      // "ride",
      // "tom",
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
    tracks: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hiHatClose: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0],
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
    setSequencerInstrumentNote: (state, action) => {
      const { instrument, step, note } = action.payload;
      state.instrumentsData[instrument].sequencerNoteGrid[step].note = note;
      state.instrumentsData[instrument].sequencerNoteGrid[step].duration = "8n";
    },
    toggleDrumStep: (state, action) => {
      const { drumName, stepIndex } = action.payload;
      const currentValue = state.drums.tracks[drumName][stepIndex];
      state.drums.tracks[drumName][stepIndex] = currentValue === 1 ? 0 : 1;
    },
    toggleStep: (state, action) => {
      console.log(action.payload, "toggleStep");
      const { noteIndex, stepIndex } = action.payload;
      const currentValue = state.grid[noteIndex][stepIndex];
      state.grid[noteIndex][stepIndex] = currentValue === 0 ? 1 : 0;
    },
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
  toggleStep,
  resetGrid,
} = sequencerSlice.actions;

export default sequencerSlice.reducer;
