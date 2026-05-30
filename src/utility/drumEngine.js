import * as Tone from 'tone';
import { DRUM_PRESETS } from '../constants/soundParamsConfig';

const createSleeperBitcrusher = () => {
  const crusher = new Tone.BitCrusher({ bits: 4 });
  crusher.set({ wet: 0 });
  crusher.bypassed = true;
  return crusher;
};

const createSleeperFilter = () => {
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 10000, // Со старта полностью открыт на максимум
  });
  filter.bypassed = true; // Усыпляем на старте в точке байпаса
  return filter;
};

const createSleeperDelay = () => {
  const delay = new Tone.FeedbackDelay({
    delayTime: '8n',
    feedback: 0.25,
    wet: 0,
  });
  delay.bypassed = true;
  return delay;
};

const connectAudioChain = (rawSynth, crusher, filter, delay) => {
  rawSynth.connect(crusher);
  crusher.connect(filter);
  filter.connect(delay);
  delay.toDestination();
};

/**
 * Вспомогательная фабрика-обертка: собирает чистую цепочку эффектов вокруг синта барабана.
 */
const wrapDrumWithEffects = (rawSynth) => {
  const crusher = createSleeperBitcrusher();
  const filter = createSleeperFilter();
  const delay = createSleeperDelay();

  connectAudioChain(rawSynth, crusher, filter, delay);

  return {
    instrument: rawSynth,
    fxBitcrusher: crusher,
    fxFilter: filter,
    fxDelay: delay,
    output: delay,
    dispose() {
      delay.dispose();
      filter.dispose();
      crusher.dispose();
      rawSynth.dispose();
    },
  };
};

const createDrums = () => {
  const DRUM_TYPE_MAP = {
    kick: Tone.MembraneSynth,
    snare: Tone.NoiseSynth,
    hiHat: Tone.MetalSynth,
    hiHatClose: Tone.MetalSynth,
    hiHatOpen: Tone.MetalSynth,
    crash: Tone.MetalSynth,
    ride: Tone.MetalSynth,
    tom: Tone.MembraneSynth,
  };

  const drumSynths = Object.entries(DRUM_TYPE_MAP).reduce(
    (acc, [drumName, SynthClass]) => {
      const presetConfig = DRUM_PRESETS[drumName] || {};

      acc[drumName] = new SynthClass(presetConfig);
      return acc;
    },
    {},
  );

  const wrappedDrums = Object.entries(drumSynths).reduce(
    (acc, [drumName, rawSynth]) => {
      acc[drumName] = wrapDrumWithEffects(rawSynth);
      return acc;
    },
    {},
  );

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
