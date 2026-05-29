import { createSlice } from '@reduxjs/toolkit';
import { SYNTH_LIST } from '../constants/constants';
import { SOUND_PARAMS } from '../constants/soundParamsConfig';

// Автоматически собираем начальное состояние из конфига для всех синтов из списка
const initialState = {
  synths: SYNTH_LIST.reduce((acc, synthName) => {
    acc[synthName] = Object.entries(SOUND_PARAMS).reduce(
      (paramAcc, [paramKey, paramConfig]) => {
        paramAcc[paramKey] = paramConfig.default;
        return paramAcc;
      },
      {},
    );
    return acc;
  }, {}),
  drums: {},
};

export const soundSettingsSlice = createSlice({
  name: 'soundSettings',
  initialState,
  reducers: {
    // Один универсальный экшен на все ручки мира
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
