import { PlaybackTrack } from '../core/playbackTrack';
import {
  calculateAbsoluteTime,
  microTimingOffset,
} from '../../utils/audioMathUtils';
import { processDrumPlaybackHit, playSynthNote } from './audioEngineTriggers';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СЕТКИ СЕКВЕНСОРА ---
const ACTIVE_HIT_MARKER = 1; // Маркер активного шага в сетке драм-машины (триггер удара)

// --- ЛОКАЛЬНЫЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---

const isTrackMissing = (track) => !track;
const isPatternDataInvalid = (data) => !data || !Array.isArray(data.patterns);
const isStepInactive = (hitValue) => hitValue !== ACTIVE_HIT_MARKER;
const isNoteMissingInGrid = (item) => !item || !item.note;

// --- ВСПОМОГАТЕЛЬНЫЕ КАЛЬКУЛЯЦИИ ВРЕМЕНИ ---

const calculateDrumStartTime = (stepIndex, measureIndex, drumIndex) => {
  const stepTime = `0:0:${stepIndex}`;
  return (
    calculateAbsoluteTime(stepTime, measureIndex) + microTimingOffset(drumIndex)
  );
};

// --- ВНУТРЕННИЕ КОНВЕЙЕРЫ СИНХРОНИЗАЦИИ ШАГОВ ---

const syncDrumTrackSteps = (
  track,
  trackSteps,
  measureIndex,
  drumIndex,
  note,
) => {
  if (!Array.isArray(trackSteps)) return;

  trackSteps.forEach((isHit, stepIndex) => {
    if (isStepInactive(isHit)) return;

    const startTime = calculateDrumStartTime(
      stepIndex,
      measureIndex,
      drumIndex,
    );
    track.add(startTime, { note, drumIndex });
  });
};

const syncMeasureDrums = (track, drumsInMeasure, measureIndex, drumNoteMap) => {
  Object.entries(drumsInMeasure).forEach(
    ([drumName, trackSteps], drumIndex) => {
      const note = drumNoteMap[drumName];
      if (isNoteMissingInGrid({ note })) return;

      syncDrumTrackSteps(track, trackSteps, measureIndex, drumIndex, note);
    },
  );
};

// Декларативная фиксация длины циклического паттерна на основе количества тактов
const applyLoopDurationFromPatterns = (track, { patterns }) => {
  track.setLoopDuration(patterns.length);
};

// --- ПУБЛИЧНЫЙ API СИНХРОНИЗАЦИИ СТЕЙТА И ЖЕЛЕЗА ---

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  tracksRef[synthName] = PlaybackTrack((time, noteData) => {
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

  drumsTrackRef.current = PlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (!engine) return;

    processDrumPlaybackHit(time, noteData, engine, drumNoteMap, release);
  });
};

export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (isTrackMissing(track) || isPatternDataInvalid(instrumentData)) return;

  track.clear();

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => !isNoteMissingInGrid(item))
      .forEach((item) => {
        const startTime = calculateAbsoluteTime(item.time, measureIndex);
        track.add(startTime, item);
      });
  });

  applyLoopDurationFromPatterns(track, instrumentData);
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (isTrackMissing(track) || isPatternDataInvalid(drumsData)) return;

  track.clear();

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    syncMeasureDrums(track, drumsInMeasure, measureIndex, drumNoteMap);
  });

  applyLoopDurationFromPatterns(track, drumsData);
};
