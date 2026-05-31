import * as Tone from 'tone';
import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../utility/audioEngineCore';

const TONE_CLASS_RESOLVER = {
  MembraneSynth: Tone.MembraneSynth,
  NoiseSynth: Tone.NoiseSynth,
  MetalSynth: Tone.MetalSynth,
};

const initializeRawDrumSynths = (typeMap) => {
  return Object.entries(typeMap).reduce((acc, [drumName, typeString]) => {
    const presetConfig = DRUM_PRESETS[drumName] || {};
    const SynthClass = TONE_CLASS_RESOLVER[typeString] || Tone.MembraneSynth;

    acc[drumName] = new SynthClass(presetConfig);
    return acc;
  }, {});
};

const buildWrappedDrumsRack = (drumSynths) => {
  return Object.entries(drumSynths).reduce((acc, [drumName, rawSynth]) => {
    const instrumentPreset = DRUM_PRESETS[drumName] || {};

    acc[drumName] = wrapInstrumentWithEffects(
      rawSynth,
      instrumentPreset,
      DRUM_EFFECTS_CHAIN,
      EFFECT_DEVICES,
    );
    return acc;
  }, {});
};

const createDrums = () => {
  const drumSynths = initializeRawDrumSynths(DRUM_TYPE_MAP);
  const wrappedDrums = buildWrappedDrumsRack(drumSynths);

  return {
    ...wrappedDrums,
    dispose() {
      Object.values(wrappedDrums).forEach((drumContainer) => {
        if (drumContainer && typeof drumContainer.dispose === 'function') {
          drumContainer.dispose();
        }
      });
    },
  };
};

export default createDrums;
