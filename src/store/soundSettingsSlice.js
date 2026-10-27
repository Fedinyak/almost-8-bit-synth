import { createSlice } from '@reduxjs/toolkit';
import { DRUM_PRESETS, SYNTH_PRESETS } from '../constants/soundParamsConfig';
import {
  LFO_DEFAULT_PAN_VALUE,
  LFO_DEFAULT_ACTIVE_STATE,
  LFO_DEFAULT_RATE_HZ,
  LFO_DEFAULT_DEPTH_MULTIPLIER,
  LFO_DEFAULT_WAVEFORM,
  LFO_DEFAULT_TARGET_PARAM,
} from '../constants/audioEngineConfig';

const preprocessedSynths = {};

const allInstrumentsPayload = { ...DRUM_PRESETS, ...SYNTH_PRESETS };
const instrumentEntries = Object.entries(allInstrumentsPayload);
const totalInstruments = instrumentEntries.length;

// Накатываем структуру LFO с заряженной по умолчанию слышимой глубиной модуляции из конфига
for (let i = 0; i < totalInstruments; i++) {
  const [name, config] = instrumentEntries[i];

  preprocessedSynths[name] = {
    ...config,
    pan: LFO_DEFAULT_PAN_VALUE,
    lfoActive: LFO_DEFAULT_ACTIVE_STATE,
    lfoRate: LFO_DEFAULT_RATE_HZ,
    lfoDepth: LFO_DEFAULT_DEPTH_MULTIPLIER,
    lfoWaveform: LFO_DEFAULT_WAVEFORM,
    lfoTarget: LFO_DEFAULT_TARGET_PARAM,
  };
}

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
