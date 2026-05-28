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

  synth.connect(crusher);

  return {
    instrument: synth,
    output: crusher,
    fxBitcrusher: crusher,

    dispose() {
      this.fxBitcrusher.dispose();
      this.instrument.dispose();
    },
  };
};

export default createSynth;
