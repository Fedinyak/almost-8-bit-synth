import * as Tone from 'tone';

/**
 * Вспомогательная фабрика-обертка: собирает чистую цепочку эффектов вокруг синта барабана.
 */
const wrapDrumWithEffects = (rawSynth) => {
  // 1. Создаем узел Биткрашера и усыпляем на старте
  const crusher = new Tone.BitCrusher({ bits: 4 });
  crusher.set({ wet: 0 });
  crusher.bypassed = true;

  // 2. Создаем узел Дилея (Эхо) лично для этого барабана
  // Ставим время задержки покороче ('8n' — 1/8 такта), чтобы на барабанах это звучало как сочный ритмичный повтор
  const delay = new Tone.FeedbackDelay({
    delayTime: '8n',
    feedback: 0.25,
    wet: 0,
  });
  delay.bypassed = true; // ЖЕЛЕЗНАЯ ИНИЦИАЛИЗАЦИЯ В НУЛЕ: ЦП отдыхает

  // 3. КОММУТИРУЕМ ЦЕПОЧКУ (ПАРОВОЗИК):
  // Нативный синт идет в Биткрашер
  rawSynth.connect(crusher);
  // Биткрашер идет в Дилей
  crusher.connect(delay);
  // Финальный эффект Дилея отправляем на мастер-выход браузера
  delay.toDestination();

  return {
    instrument: rawSynth,
    fxBitcrusher: crusher,
    fxDelay: delay, // Передаем ссылку на узел строго по ключу nodeKey из паспорта!
    output: delay, // Конечная точка выхода всей цепочки
    dispose() {
      // Чистим память без утечек при удалении
      delay.dispose();
      crusher.dispose();
      rawSynth.dispose();
    },
  };
};

const createDrums = () => {
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
