import {
  clearTrackNotes,
  createPlaybackTrack,
  setTrackLoopDuration,
  writeNoteToTrack,
  triggerDrumVisualLevel,
  setEnginePosition,
} from './audioEngineCore';
import {
  calculateAbsoluteTime,
  compensateLatency,
  microTimingOffset,
} from './audioMathUtils';
import { STEPS_IN_MEASURE } from '../constants/constants';
import { backupAndDropPatternData } from '../slices/patternsSlice';
import {
  setPendingPattern,
  setIsLoopingFalse,
  setCurrentPlayPatternIndex,
  setCurrentStep,
  setSequencerPlayState,
  decrementPatternCountSync,
  scheduleDeleteLastPattern,
} from '../slices/playerSlice';

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

const processDrumPlaybackHit = (
  time,
  noteData,
  engine,
  drumNoteMap,
  release,
) => {
  const instrumentName = drumNoteMap[noteData.note];

  const drumContainer = engine[instrumentName];
  if (!drumContainer || !drumContainer.instrument) return;

  const playTime = compensateLatency(time);

  playDrumHit(drumContainer.instrument, release, playTime);

  if (typeof noteData.drumIndex === 'number') {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
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

  clearTrackNotes(track);

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    syncMeasureDrums(track, drumsInMeasure, measureIndex, drumNoteMap);
  });

  setTrackLoopDuration(track, drumsData.patterns.length);
};

export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (!synthInstance?.output) return;

  if (typeof synthInstance.output.disconnect === 'function') {
    try {
      synthInstance.output.disconnect();
    } catch (e) {}
  }

  synthInstance.output.connect(channel);
  channel.connect(analyser);
  channel.toDestination();
};

// ORCHESTRATION LAYER: Decoupled thunk operations to align UI state with core audio playback engine
export const executePatternPlaybackTrigger =
  (index) => (dispatch, getState) => {
    const { player } = getState();
    const { sequencerPlayState } = player;

    if (sequencerPlayState === 'start') {
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingFalse());
    }
    if (sequencerPlayState === 'stop') {
      setEnginePosition(index);
      dispatch(setCurrentPlayPatternIndex(index));
      dispatch(setCurrentStep(index * STEPS_IN_MEASURE));
      dispatch(setIsLoopingFalse());
      dispatch(setSequencerPlayState('start'));
    }
  };

export const executeRemoveLastPatternRequest = () => (dispatch, getState) => {
  const { player } = getState();
  const {
    patternCount,
    sequencerPlayState,
    isLooping,
    currentPlayPatternIndex,
  } = player;

  if (patternCount <= 1) return;
  const lastPatternIndex = patternCount - 1;

  if (sequencerPlayState === 'stop') {
    dispatch(backupAndDropPatternData(lastPatternIndex));
    dispatch(decrementPatternCountSync());
    return;
  }
  if (isLooping) {
    dispatch(scheduleDeleteLastPattern());
    return;
  }
  if (sequencerPlayState === 'pause') {
    if (currentPlayPatternIndex === lastPatternIndex) {
      setEnginePosition(0);
      dispatch(setCurrentPlayPatternIndex(0));
    }
    dispatch(backupAndDropPatternData(lastPatternIndex));
    dispatch(decrementPatternCountSync());
    return;
  }
  if (sequencerPlayState === 'start') {
    if (currentPlayPatternIndex === lastPatternIndex) {
      dispatch(scheduleDeleteLastPattern());
    } else {
      dispatch(backupAndDropPatternData(lastPatternIndex));
      dispatch(decrementPatternCountSync());
    }
  }
};
