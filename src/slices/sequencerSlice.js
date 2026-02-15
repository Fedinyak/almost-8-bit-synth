import { createSlice } from "@reduxjs/toolkit";

export const NOTES_COUNT = 72; // C1-B6
export const STEPS_PER_PAGE = 32;
export const TOTAL_STEPS = 256;

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
  currentStep: 0,
  viewPage: 0,
  sequencerNoteGrid: [
    // { time: "0:0:0", note: "C4", duration: "4n", velocity: 0.9 },
    // { time: "0:0:2", note: "G4", duration: "8n", velocity: 0.7 },
    // { time: "0:1:0", note: "E4", duration: "4n", velocity: 0.8 },
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

    // { time: "1:0:0", note: "C4", duration: "8n" },
    // { time: "1:0:1", note: null },
    // { time: "1:0:2", note: null },
    // { time: "1:0:3", note: null },

    // { time: "1:1:0", note: "C4", duration: "8n" },
    // { time: "1:1:1", note: null },
    // { time: "1:1:2", note: null },
    // { time: "1:1:3", note: null },

    // { time: "1:2:0", note: "C4", duration: "8n" },
    // { time: "1:2:1", note: null },
    // { time: "1:2:2", note: null },
    // { time: "1:2:3", note: null },

    // { time: "1:3:0", note: "C5", duration: "8n" },
    // { time: "1:3:1", note: null },
    // { time: "1:3:2", note: null },
    // { time: "1:3:3", note: null },
  ],
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
    setSequencerNote: (state, action) => {
      const { step, note } = action.payload;
      state.sequencerNoteGrid[step].note = note;
      state.sequencerNoteGrid[step].duration = "8n";
    },
    toggleStep: (state, action) => {
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
  setSequencerNote,
  toggleStep,
  resetGrid,
} = sequencerSlice.actions;

export default sequencerSlice.reducer;
