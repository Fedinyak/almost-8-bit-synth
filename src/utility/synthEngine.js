import * as Tone from 'tone';

const createSynth = () => {
  // 1. Создаем сам синтезатор
  const synth = new Tone.MonoSynth({
    oscillator: { type: 'sawtooth' }, // Оставляем пилу для жирного чиптюн-звука
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
  });

  // 2. Создаем узел Биткрашера
  const crusher = new Tone.BitCrusher({
    bits: 4,
    wet: 0, // Стартует в режиме Bypass (чистый звук)
  });

  // 3. Соединяем их последовательно в одну внутреннюю цепочку
  synth.connect(crusher);

  // 4. Возвращаем ЧИСТЫЙ объект-контейнер без подмены прототипов
  return {
    instrument: synth, // Сам синтезатор (для нот и ADSR)
    output: crusher, // Финальная точка выхода звука (для подключения к микшеру/каналам)
    fxBitcrusher: crusher, // Ссылка на эффект (для крутилок)

    // Явный, безопасный метод полной очистки памяти от всей цепочки
    dispose() {
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
