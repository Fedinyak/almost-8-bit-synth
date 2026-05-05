import * as Tone from "tone";
import createSynth from "./synthEngine";
import createDrums from "./drumEngine";

const STEPS_PER_BEAT = 4;

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

export const initializeSynths = (synthList, enginesRef) => {
  synthList.forEach(synthName => {
    if (!enginesRef[synthName]) {
      enginesRef[synthName] = createSynth();
    }
  });
};

export const initializeDrums = drumsRef => {
  if (!drumsRef.current) {
    drumsRef.current = createDrums();
  }
};

const createPlaybackTrack = onStepAction => {
  const track = new Tone.Part(onStepAction, []).start(0);
  track.loop = true;
  return track;
};
export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  tracksRef[synthName] = createPlaybackTrack((time, noteData) => {
    const engine = enginesRef[synthName];
    if (engine) playSynthNote(engine, time, noteData);
  });
};

export const setupDrumsPlayback = (
  drumsEngineRef,
  drumsTrackRef,
  drumNoteMap,
  release,
) => {
  if (drumsTrackRef.current) return;

  drumsTrackRef.current = createPlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (!engine) return;

    const instrumentName = drumNoteMap[noteData.note];
    const instrument = engine[instrumentName];

    if (instrument) {
      const playTime = compensateLatency(time);
      playDrumHit(instrument, release, playTime);
    }
  });
};
export const playSynthNote = (synth, time, noteData) => {
  synth.triggerAttackRelease(noteData.note, noteData.duration, time);
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};

export const getTotalSteps = (patterns, stepsPerMeasure = 16) => {
  const patternsCount = patterns?.length || 1;
  return patternsCount * stepsPerMeasure;
};

export const calculateCurrentStep = (time, totalSteps) => {
  const ticksPerStep = Tone.Transport.PPQ / STEPS_PER_BEAT;
  const currentTick = Tone.Transport.getTicksAtTime(time);

  return Math.floor(currentTick / ticksPerStep) % totalSteps;
};

export const scheduleFrame = (time, drawFunction) =>
  Tone.Draw.schedule(drawFunction, time);

export const startDrawingLoop = (callback, rate) =>
  Tone.Transport.scheduleRepeat(callback, rate);

export const stopDrawingLoop = id => Tone.Transport.clear(id);

export const setEngineBpm = bpmValue => {
  Tone.Transport.bpm.value = bpmValue;
};

export const setPlayState = state => {
  if (state === "start") {
    Tone.Transport.start();
  } else {
    Tone.Transport.stop();
  }
};
