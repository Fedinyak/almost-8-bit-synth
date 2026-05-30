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

  const delay = new Tone.FeedbackDelay({
    delayTime: '4n',
    feedback: 0.3,
    wet: 0,
  });
  delay.bypassed = true; // усыпляем на старте, пока ручка в нуле

  synth.connect(crusher);
  crusher.connect(delay);

  return {
    instrument: synth,
    output: delay,
    fxBitcrusher: crusher,
    fxDelay: delay,

    dispose() {
      this.fxDelay.dispose();
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
