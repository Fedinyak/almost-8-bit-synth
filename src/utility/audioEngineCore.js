import * as Tone from "tone";

export const createPlaybackTrack = onStepAction => {
  const track = new Tone.Part(onStepAction, []).start(0);
  track.loop = true;
  return track;
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

export const clearTrackNotes = track => {
  track.clear();
};

// Записать конкретную ноту на дорожку в нужное время
export const writeNoteToTrack = (track, time, noteData) => {
  track.add(time, noteData);
};

export const setTrackLoopDuration = (track, numberOfMeasures) => {
  track.loopEnd = `${numberOfMeasures}m`;
};
