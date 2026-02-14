import * as Tone from "tone";

const crusher = new Tone.BitCrusher(4).toDestination();

export const synth = new Tone.MonoSynth({
  oscillator: { type: "square" },
  envelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.3,
    release: 0.02,
  },
  filterEnvelope: {
    baseFrequency: 10000,
    octaves: 0,
  },
}).connect(crusher);

const playSound = async note => {
  // Not play null note, for optimization
  if (!note) return;
  await Tone.start(); // required for user gesture
  // const synth = new Tone.Synth().toDestination();
  console.log(Tone.context.state, "Tone.BaseContext.state");
  synth.triggerAttackRelease(note, "8n");
};

export default playSound;
