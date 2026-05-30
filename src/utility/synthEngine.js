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
  crusher.bypassed = true; // Усыпляем на старте для чистоты звука

  // Создаем чистый узел Дилея (Эхо) с задержкой в 1/4 такта и фидбеком 0.3
  const delay = new Tone.FeedbackDelay({
    delayTime: '4n',
    feedback: 0.3,
    wet: 0,
  });
  delay.bypassed = true; // Тоже усыпляем на старте, пока ручка в нуле

  // СТРОИМ ПОСЛЕДОВАТЕЛЬНЫЙ АУДИО-ГРАФ (ПАРОВОЗИК):
  // Синт стреляет в Биткрашер
  synth.connect(crusher);
  // Биткрашер стреляет в Дилей
  crusher.connect(delay);
  // Теперь финальной точкой выхода всей цепочки синта становится Дилей!

  return {
    instrument: synth,
    output: delay, // Изменили точку выхода контейнера на последний узел в графе
    fxBitcrusher: crusher,
    fxDelay: delay, // Отдаем ссылку на узел строго по ключу nodeKey из паспорта!

    dispose() {
      this.fxDelay.dispose();
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
