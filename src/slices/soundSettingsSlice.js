import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  synths: {
    synth1: {
      attackMode: 0, // 0 - FAST (щелчок), 1 - SLOW (плавный наплыв)
      bitcrusherOn: false, // false - выключен (Dry), true - включен на 100% (Wet)
    },
    synth2: {
      attackMode: 0,
      bitcrusherOn: false,
    },
    synth3: {
      attackMode: 0,
      bitcrusherOn: false,
    },
  },

  drums: {},
};

export const soundSettingsSlice = createSlice({
  name: 'soundSettings',
  initialState,
  reducers: {
    // Утилитарный редюсер для переключения Атаки (принимает имя синта в payload, например 'synth1')
    toggleSynthAttackMode: (state, action) => {
      const synthName = action.payload;
      if (state.synths[synthName]) {
        // Переключаем бинарный режим: если был 0, станет 1, и наоборот
        state.synths[synthName].attackMode =
          state.synths[synthName].attackMode === 0 ? 1 : 0;
      }
    },

    // Утилитарный редюсер для включения/выключения Биткрашера (принимает имя синта в payload)
    toggleSynthBitcrusher: (state, action) => {
      const synthName = action.payload;
      if (state.synths[synthName]) {
        // Переключаем классический флаг true/false
        state.synths[synthName].bitcrusherOn =
          !state.synths[synthName].bitcrusherOn;
      }
    },
  },
});

export const { toggleSynthAttackMode, toggleSynthBitcrusher } =
  soundSettingsSlice.actions;

export default soundSettingsSlice.reducer;
