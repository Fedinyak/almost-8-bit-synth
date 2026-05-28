import { configureStore } from '@reduxjs/toolkit';
import noteSlice from './noteSlice';
import playerReducer from './playerSlice';
import patternsReducer from './patternsSlice';
import soundSettingsReducer from './soundSettingsSlice';

export const store = configureStore({
  reducer: {
    note: noteSlice,
    player: playerReducer,
    patterns: patternsReducer,
    soundSettings: soundSettingsReducer,
  },
});
