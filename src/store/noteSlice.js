import { createSlice } from '@reduxjs/toolkit';

const MIN_OCTAVE = 1;
const MAX_OCTAVE = 5;

const initialState = {
  activeNote: null,
  octave: 3,
};

export const noteSlice = createSlice({
  name: 'note',
  initialState,
  reducers: {
    setActiveNote: (state, action) => {
      state.activeNote = action.payload;
    },
    decreaseOctave: (state) => {
      if (state.octave > MIN_OCTAVE) {
        state.octave -= 1;
      }
    },
    increaseOctave: (state) => {
      if (state.octave < MAX_OCTAVE) {
        state.octave += 1;
      }
    },
  },
});

export const { setActiveNote, decreaseOctave, increaseOctave } =
  noteSlice.actions;

export default noteSlice.reducer;
