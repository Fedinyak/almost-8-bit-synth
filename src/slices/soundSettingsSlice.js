import { createSlice } from '@reduxjs/toolkit';
import { SYNTH_LIST, DRUM_KIT_LIST } from '../constants/constants'; // Импортируем список твоих барабанов
import { SOUND_PARAMS } from '../constants/soundParamsConfig';

// Объединяем оба списка в один массив, чтобы одной левой собрать плоский стейт для всех
const ALL_AUDIO_ENGINES = [...SYNTH_LIST, ...DRUM_KIT_LIST];

const initialState = {
  // Автоматически собираем начальное состояние из паспорта вообще для всех движков (и синтов, и барабанов!)
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
    // Твой оригинальный универсальный экшен теперь автоматически работает на ВСЕ ручки мира,
    // включая синты, кики, снэры и хэты, потому что они лежат в одной плоской структуре!
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
