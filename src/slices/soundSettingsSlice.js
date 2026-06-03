import { createSlice } from '@reduxjs/toolkit';
import { DRUM_PRESETS, SYNTH_PRESETS } from '../constants/soundParamsConfig';

const preprocessedSynths = {};
Object.entries({ ...DRUM_PRESETS, ...SYNTH_PRESETS }).forEach(
  ([name, config]) => {
    preprocessedSynths[name] = {
      ...config,
      lfoActive: false,
      lfoRate: 5.0,
      lfoDepth: 0.5, // Новое поле глубины модуляции
      lfoWaveform: 'sine', // Новое поле формы волны
      lfoTarget: 'filterLowpassCutoff',
    };
  },
);

const initialState = {
  synths: preprocessedSynths,
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
