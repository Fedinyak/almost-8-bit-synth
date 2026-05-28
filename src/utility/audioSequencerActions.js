import createSynth from './synthEngine';
import createDrums from './drumEngine';
import {
  clearTrackNotes,
  createPlaybackTrack,
  setTrackLoopDuration,
  writeNoteToTrack,
  triggerDrumVisualLevel,
} from './audioEngineCore';
import {
  calculateAbsoluteTime,
  compensateLatency,
  microTimingOffset,
} from './audioMathUtils';
import { resetDrumLevels, resetSynthAnalysers } from './visualizerState';

export const initializeSynths = (synthList, enginesRef) => {
  synthList.forEach((synthName) => {
    if (!enginesRef[synthName]) {
      enginesRef[synthName] = createSynth();
    }
  });
};

export const initializeDrums = (drumsRef) => {
  if (!drumsRef.current) {
    drumsRef.current = createDrums();
  }
};

export const playSynthNote = (synth, time, noteData) => {
  if (synth && synth.instrument) {
    synth.instrument.triggerAttackRelease(
      noteData.note,
      noteData.duration,
      time,
    );
  }
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  tracksRef[synthName] = createPlaybackTrack((time, noteData) => {
    const engine = enginesRef[synthName];
    if (engine) playSynthNote(engine, time, noteData);
  });
};

const processDrumPlaybackHit = (
  time,
  noteData,
  engine,
  drumNoteMap,
  release,
) => {
  const instrumentName = drumNoteMap[noteData.note];
  const instrument = engine[instrumentName];
  if (!instrument) return;

  const playTime = compensateLatency(time);

  playDrumHit(instrument, release, playTime);

  if (typeof noteData.drumIndex === 'number') {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
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

    processDrumPlaybackHit(time, noteData, engine, drumNoteMap, release);
  });
};

export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (!track || !instrumentData?.patterns) return;

  clearTrackNotes(track);

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => item.note)
      .forEach((item) => {
        const startTime = calculateAbsoluteTime(item.time, measureIndex);
        writeNoteToTrack(track, startTime, item);
      });
  });

  setTrackLoopDuration(track, instrumentData.patterns.length);
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
    writeNoteToTrack(track, startTime, { note, drumIndex });
  });
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (!track || !drumsData?.patterns) return;
  clearTrackNotes(track);

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    Object.entries(drumsInMeasure).forEach(
      ([drumName, trackSteps], drumIndex) => {
        const note = drumNoteMap[drumName];
        if (!note) return;

        syncDrumTrackSteps(track, trackSteps, measureIndex, drumIndex, note);
      },
    );
  });

  setTrackLoopDuration(track, drumsData.patterns.length);
};

export const cleanupAudioResources = ({
  synths,
  parts,
  drumEngine,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  if (synths) {
    Object.values(synths).forEach((synthContainer) => {
      if (synthContainer && typeof synthContainer.dispose === 'function') {
        synthContainer.dispose();
      }
    });
  }

  const disposeRes = (res) =>
    res && !res.disposed && typeof res.dispose === 'function' && res.dispose();

  if (analysersRef?.current)
    Object.values(analysersRef.current).forEach(disposeRes);
  if (channelsRef?.current)
    Object.values(channelsRef.current).forEach(disposeRes);

  if (analysersRef) analysersRef.current = {};
  if (channelsRef) channelsRef.current = {};
  resetSynthAnalysers();

  const audioResources = [
    ...Object.values(parts || {}),
    ...Object.values(drumEngine || {}),
    drumPart,
  ];

  audioResources.filter(Boolean).forEach(disposeRes);
};

export const stopAllAudio = (refs) => {
  cleanupAudioResources({
    synths: refs.synths.current,
    parts: refs.parts.current,
    drumEngine: refs.drumsEngine.current,
    drumPart: refs.drumsPart.current,
    analysersRef: refs.synthAnalysersRef,
    channelsRef: refs.synthChannelsRef,
  });

  refs.synths.current = {};
  refs.parts.current = {};
  refs.drumsEngine.current = null;
  refs.drumsPart.current = null;

  resetDrumLevels();
};
