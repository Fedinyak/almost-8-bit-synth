import { createSlice } from '@reduxjs/toolkit';
import { SYNTH_LIST, DRUM_KIT_LIST } from '../constants/constants';
import { SOUND_PARAMS } from '../constants/soundParamsConfig';

const ALL_AUDIO_ENGINES = [...SYNTH_LIST, ...DRUM_KIT_LIST];

const initialState = {
  synths: ALL_AUDIO_ENGINES.reduce((acc, engineName) => {
    acc[engineName] = Object.entries(SOUND_PARAMS).reduce(
      (paramAcc, [paramKey, paramConfig]) => {
        paramAcc[paramKey] = paramConfig.default;
        return paramAcc;
      },
      {},
    );
    return acc;
  }, {}),
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
