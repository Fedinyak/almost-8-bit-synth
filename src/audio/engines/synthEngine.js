import * as Tone from 'tone';
import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

const createSynth = (synthName) => {
  const presetConfig = SYNTH_PRESETS[synthName] || {};

  const rawSynth = new Tone.MonoSynth({
    oscillator: { type: presetConfig.oscillatorType || 'square' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
  });

  return wrapInstrumentWithEffects(
    rawSynth,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

export default createSynth;
