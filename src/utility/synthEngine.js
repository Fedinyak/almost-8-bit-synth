import * as Tone from 'tone';

const createSynth = () => {
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
  });

  const crusher = new Tone.BitCrusher({
    bits: 4,
    wet: 0,
  });
  crusher.bypassed = true;

  // 🧱 СОЗДАЕМ УЗЕЛ НА ТИВНОГО 8-БИТ ФИЛЬТРА ТИПА LOWPASS
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 10000, // Со старта полностью открыт на максимум
  });
  filter.bypassed = true; // ЖЕЛЕЗНАЯ ИНИЦИАЛИЗАЦИЯ: Усыпляем на старте в точке байпаса!

  const delay = new Tone.FeedbackDelay({
    delayTime: '4n',
    feedback: 0.3,
    wet: 0,
  });
  delay.bypassed = true;

  // 🦾 КОММУТИРУЕМ ЦЕПОЧКУ (ПОСЛЕДОВАТЕЛЬНЫЙ ПАРОВОЗИК):
  synth.connect(crusher);
  crusher.connect(filter); // Врезаем фильтр сразу за Биткрашером
  filter.connect(delay); // Фильтр стреляет в Дилей

  return {
    instrument: synth,
    output: delay, // Конечной точкой выхода всей цепи синта остается Дилей
    fxBitcrusher: crusher,
    fxFilter: filter, // Отдаем ссылку на фильтр строго по ключу nodeKey из паспорта!
    fxDelay: delay,

    dispose() {
      this.fxDelay.dispose();
      this.fxFilter.dispose(); // Не забываем бережно зачистить память
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
