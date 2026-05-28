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

  // Соединяем их последовательно
  synth.connect(crusher);

  // Возвращаем ЧИСТЫЙ объект-контейнер. Никакой магии и подмены методов!
  return {
    instrument: synth, // Сам синтезатор (для нот и ADSR)
    output: crusher, // Финальная точка выхода звука (для подключения к микшеру)
    fxBitcrusher: crusher, // Ссылка на эффект (для крутилок)

    // Легальный и явный метод полной очистки памяти
    dispose() {
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
