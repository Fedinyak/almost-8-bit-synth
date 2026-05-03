import * as Tone from "tone";

export const microTimingOffset = drumIndex => {
  const DRUM_PHASE_OFFSET = 0.001;
  return drumIndex * DRUM_PHASE_OFFSET;
};

export const calculateAbsoluteTime = (time, measureIndex) => {
  return (
    Tone.Time(time).toSeconds() + Tone.Time(`${measureIndex}m`).toSeconds()
  );
};

export const cleanupAudioResources = ({
  synths,
  parts,
  drumEngine,
  drumPart,
}) => {
  const audioResources = [
    ...Object.values(parts),
    ...Object.values(synths),
    ...Object.values(drumEngine || {}),
    drumPart,
  ];

  audioResources.filter(Boolean).forEach(res => res.dispose());
};

export const compensateLatency = plannedTime => {
  const SCHEDULING_LOOKAHEAD_SEC = 0.01;
  return Math.max(plannedTime, Tone.now() + SCHEDULING_LOOKAHEAD_SEC);
};

export const playSynthNote = (synth, time, noteData) => {
  synth.triggerAttackRelease(noteData.note, noteData.duration, time);
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};
