import { PlaybackTrack } from '../core/playbackTrack';
import {
  calculateAbsoluteTime,
  microTimingOffset,
} from '../../utils/audioMathUtils';
import { processDrumPlaybackHit, playSynthNote } from './audioEngineTriggers';

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  tracksRef[synthName] = new PlaybackTrack((time, noteData) => {
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

  drumsTrackRef.current = new PlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (!engine) return;

    processDrumPlaybackHit(time, noteData, engine, drumNoteMap, release);
  });
};

export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (!track || !instrumentData?.patterns) return;

  // Прямой вызов метода объекта дорожки
  track.clear();

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => item.note)
      .forEach((item) => {
        const startTime = calculateAbsoluteTime(item.time, measureIndex);
        // Прямой пуш в объект дорожки
        track.add(startTime, item);
      });
  });

  const secondsPerMeasure = (60 / 120) * 4;
  track.loopEnd = instrumentData.patterns.length * secondsPerMeasure;
};

const calculateDrumStartTime = (stepIndex, measureIndex, drumIndex) => {
  const stepTime = `0:0:${stepIndex}`;
  return (
    calculateAbsoluteTime(stepTime, measureIndex) + microTimingOffset(drumIndex)
  );
};

const syncDrumTrackSteps = (
  track,
  trackSteps,
  measureIndex,
  drumIndex,
  note,
) => {
  if (!Array.isArray(trackSteps)) return;

  trackSteps.forEach((isHit, stepIndex) => {
    if (isHit !== 1) return;

    const startTime = calculateDrumStartTime(
      stepIndex,
      measureIndex,
      drumIndex,
    );
    // Прямой пуш в объект дорожки
    track.add(startTime, { note, drumIndex });
  });
};

const syncMeasureDrums = (track, drumsInMeasure, measureIndex, drumNoteMap) => {
  Object.entries(drumsInMeasure).forEach(
    ([drumName, trackSteps], drumIndex) => {
      const note = drumNoteMap[drumName];
      if (!note) return;

      syncDrumTrackSteps(track, trackSteps, measureIndex, drumIndex, note);
    },
  );
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (!track || !drumsData?.patterns) return;

  // Прямой вызов метода объекта дорожки
  track.clear();

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    syncMeasureDrums(track, drumsInMeasure, measureIndex, drumNoteMap);
  });

  const secondsPerMeasure = (60 / 120) * 4;
  track.loopEnd = drumsData.patterns.length * secondsPerMeasure;
};
