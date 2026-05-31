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
  const synthEntries = Object.entries(typeMap).map(([drumName, typeString]) => {
    const presetConfig = DRUM_PRESETS[drumName] || {};
    const SynthClass = TONE_CLASS_RESOLVER[typeString] || Tone.MembraneSynth;

    const nativeSynth = new SynthClass(presetConfig);
    return [drumName, nativeSynth];
  });

  return Object.fromEntries(synthEntries);
};

const buildWrappedDrumsRack = (drumSynths) => {
  const wrappedEntries = Object.entries(drumSynths).map(
    ([drumName, rawSynth]) => {
      const instrumentPreset = DRUM_PRESETS[drumName] || {};

      const wrappedSynth = wrapInstrumentWithEffects(
        rawSynth,
        instrumentPreset,
        DRUM_EFFECTS_CHAIN,
        EFFECT_DEVICES,
      );

      return [drumName, wrappedSynth];
    },
  );

  return Object.fromEntries(wrappedEntries);
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
