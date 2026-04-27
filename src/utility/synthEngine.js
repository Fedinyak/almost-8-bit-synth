import * as Tone from "tone";

const createSynth = () => {
  return new Tone.MonoSynth({
    oscillator: { type: "square" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
  }).toDestination();
};

export default createSynth;
