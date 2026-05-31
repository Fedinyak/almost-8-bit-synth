import { createSlice } from '@reduxjs/toolkit';
import { DRUM_PRESETS, SYNTH_PRESETS } from '../constants/soundParamsConfig';

const initialState = {
  synths: {
    ...DRUM_PRESETS,
    ...SYNTH_PRESETS,
  },
};

export const soundSettingsSlice = createSlice({
  name: 'soundSettings',
  initialState,
  reducers: {
    updateSynthParam: (state, action) => {
      const { synthName, paramName, value } = action.payload;
      if (state.synths[synthName]) {
        state.synths[synthName][paramName] = value;
      }
    },
  },
});

export const { updateSynthParam } = soundSettingsSlice.actions;
export default soundSettingsSlice.reducer;
