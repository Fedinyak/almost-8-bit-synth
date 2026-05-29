import * as Tone from 'tone';

/**
 * Вспомогательная фабрика-обертка: собирает чистую цепочку эффектов вокруг синта барабана.
 * Никаких захардкоженных настроек — всё управляется динамически из паспорта.
 */
const wrapDrumWithEffects = (rawSynth) => {
  // Создаем узел Биткрашера
  const crusher = new Tone.BitCrusher({ bits: 4 });

  // ЖЕЛЕЗНАЯ ИНИЦИАЛИЗАЦИЯ В НУЛЕ:
  // Выключаем микс эффекта (wet: 0) и аппаратно усыпляем узел (bypassed: true) прямо при создании,
  // чтобы барабан звучал кристально чисто, а процессор отдыхал с первой секунды.
  crusher.set({ wet: 0 });
  crusher.bypassed = true;

  // Коммутируем цепочку: Синт -> Биткрашер -> Мастер-выход
  rawSynth.connect(crusher);
  crusher.toDestination();

  return {
    instrument: rawSynth,
    fxBitcrusher: crusher,
    output: crusher,
    dispose() {
      crusher.dispose();
      rawSynth.dispose();
    },
  };
};

const createDrums = () => {
  // Инициализируем базовые нативные синтезаторы барабанов
  const drumSynths = {
    kick: new Tone.MembraneSynth(),
    snare: new Tone.NoiseSynth({
      envelope: { decay: 0.1 },
    }),
    hiHat: new Tone.MetalSynth({
      envelope: { decay: 0.05 },
      volume: -12,
    }),
    hiHatClose: new Tone.MetalSynth({
      envelope: { decay: 0.04 },
      volume: -12,
    }),
    hiHatOpen: new Tone.MetalSynth({
      envelope: { decay: 0.3 },
      volume: -10,
    }),
    crash: new Tone.MetalSynth({
      envelope: { attack: 0.01, decay: 1.5 },
      volume: -8,
    }),
    ride: new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.8 },
      volume: -10,
    }),
    tom: new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4,
    }),
  };

  // Динамически мапим каждый барабан через фабрику-обертку
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
