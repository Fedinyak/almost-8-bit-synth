import * as Tone from 'tone';
import { DRUM_PRESETS } from '../constants/soundParamsConfig';

/**
 * Вспомогательная фабрика-обертка: собирает чистую цепочку эффектов вокруг синта барабана.
 */
const wrapDrumWithEffects = (rawSynth) => {
  // 1. Создаем узел Биткрашера и усыпляем на старте
  const crusher = new Tone.BitCrusher({ bits: 4 });
  crusher.set({ wet: 0 });
  crusher.bypassed = true;

  // 2. Создаем узел Дилея (Эхо) лично для этого барабана
  const delay = new Tone.FeedbackDelay({
    delayTime: '8n',
    feedback: 0.25,
    wet: 0,
  });
  delay.bypassed = true; // Намертво глушим на старте, чтобы Райд не гудел бесконечно!

  // 3. Коммутируем последовательную цепочку: Синт -> Биткрашер -> Дилей -> Выход
  rawSynth.connect(crusher);
  crusher.connect(delay);
  delay.toDestination();

  return {
    instrument: rawSynth,
    fxBitcrusher: crusher,
    fxDelay: delay,
    output: delay,
    dispose() {
      delay.dispose();
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
