import * as Tone from "tone";

const synth = new Tone.Synth({
  oscillator: { type: "square" },
}).toDestination();

const playSound = async note => {
  // Not play null note, for optimization
  if (!note) return;
  await Tone.start(); // required for user gesture
  // const synth = new Tone.Synth().toDestination();
  console.log(Tone.context.state, "Tone.BaseContext.state");
  synth.triggerAttackRelease(note, "8n");
};

export default playSound;
