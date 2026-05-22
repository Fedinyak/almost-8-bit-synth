import { configureStore } from '@reduxjs/toolkit';
import noteSlice from './noteSlice';
// import sequencerSlice from "./sequencerSlice";
import playerReducer from './playerSlice';
import patternsReducer from './patternsSlice';

export const store = configureStore({
  reducer: {
    note: noteSlice,
    // sequencer: sequencerSlice,
    player: playerReducer,
    patterns: patternsReducer,
  },
});
