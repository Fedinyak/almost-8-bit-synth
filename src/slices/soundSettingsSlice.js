import { createSlice } from '@reduxjs/toolkit';
import { DRUM_PRESETS, SYNTH_PRESETS } from '../constants/soundParamsConfig';

const preprocessedSynths = {};

// Автоматически накатываем структуру LFO на ВСЕ инструменты драм-машины и синтов
Object.entries({ ...DRUM_PRESETS, ...SYNTH_PRESETS }).forEach(
  ([name, config]) => {
    preprocessedSynths[name] = {
      ...config,
      lfoActive: false,
      lfoRate: 5.0,
      lfoDepth: 0.5,
      lfoWaveform: 'sine',
      lfoTarget: 'filterLowpassCutoff', // Дефолтная цель. Для барабанов без фильтра LFO просто будет спать, пока юзер не сменит цель на Volume или Wet
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
