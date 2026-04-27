import * as Tone from "tone";

const createDrums = () => {
  return {
    kick: new Tone.MembraneSynth().toDestination(),
    snare: new Tone.NoiseSynth({
      envelope: { decay: 0.1 },
    }).toDestination(),
    hiHat: new Tone.MetalSynth({
      envelope: { decay: 0.05 },
      volume: -12,
    }).toDestination(),
    hiHatClose: new Tone.MetalSynth({
      envelope: { decay: 0.04 },
      volume: -12,
    }).toDestination(),
    hiHatOpen: new Tone.MetalSynth({
      envelope: { decay: 0.3 },
      volume: -10,
    }).toDestination(),
    crash: new Tone.MetalSynth({
      envelope: { attack: 0.01, decay: 1.5 },
      volume: -8,
    }).toDestination(),
    ride: new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.8 },
      volume: -10,
    }).toDestination(),
    tom: new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4,
    }).toDestination(),
  };
};

export default createDrums;
