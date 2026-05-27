import * as Tone from 'tone';
import { LOOKAHEAD_OFFSET_SEC } from '../constants/constants';

export const createPlaybackTrack = (onStepAction) => {
  const track = new Tone.Part(onStepAction, []).start(0);
  track.loop = true;
  return track;
};

export const scheduleFrame = (time, drawFunction) =>
  Tone.Draw.schedule(drawFunction, time);

// НОВАЯ ФУНКЦИЯ: Изолированный триггер уровня барабана для визуалайзера
export const triggerDrumVisualLevel = (drumIndex, time) => {
  Tone.Draw.schedule(() => {
    if (!window.__drumLevels) window.__drumLevels = new Float32Array(8);
    window.__drumLevels[drumIndex] = 1.0;
  }, time);
};

export const startDrawingLoop = (callback, rate) =>
  Tone.Transport.scheduleRepeat(callback, rate);

export const stopDrawingLoop = (id) => Tone.Transport.clear(id);

export const setEngineBpm = (bpmValue) => {
  Tone.Transport.bpm.value = bpmValue;
};

export const setPlayState = (state) => {
  if (state === 'start') {
    Tone.Transport.start();
  } else if (state === 'pause') {
    Tone.Transport.pause();
  } else {
    Tone.Transport.stop();
  }
};

export const clearTrackNotes = (track) => {
  track.clear();
};

export const writeNoteToTrack = (track, time, noteData) => {
  track.add(time, noteData);
};

export const setTrackLoopDuration = (track, numberOfMeasures) => {
  track.loopEnd = `${numberOfMeasures}m`;
};

export const setEnginePosition = (patternIndex) => {
  const patternStartTimeInSeconds = Tone.Time(`${patternIndex}m`).toSeconds();

  const quantizedJumpTime = Math.max(
    0,
    patternStartTimeInSeconds - LOOKAHEAD_OFFSET_SEC,
  );

  setGlobalTransportTime(quantizedJumpTime);
};

export const setGlobalTransportTime = (seconds) => {
  Tone.Transport.seconds = seconds;
};

// Для зацикливания ОДНОГО конкретного паттерна (Режим ЛУП)
export const enableEngineLoop = (patternIndex) => {
  Tone.Transport.loopStart = `${patternIndex}m`;
  Tone.Transport.loopEnd = `${patternIndex + 1}m`;
  Tone.Transport.loop = true;
};

export const disableEngineLoop = () => {
  Tone.Transport.loop = false;
};

// НОВЫЕ ФУНКЦИИ: Для контроля цикла ВСЕГО трека по его реальной длине (Режим ПЛЕЙ)
export const enableGlobalTransportLoop = (numberOfMeasures) => {
  Tone.Transport.loopStart = `0m`;
  Tone.Transport.loopEnd = `${numberOfMeasures}m`;
  Tone.Transport.loop = true;
};
