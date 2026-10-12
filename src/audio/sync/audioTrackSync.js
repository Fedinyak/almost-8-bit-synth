import { PlaybackTrack } from '../core/playbackTrack';
import { processDrumPlaybackHit, playSynthNote } from './audioEngineTriggers';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СЕТКИ СЕКВЕНСОРА ---
const ACTIVE_HIT_MARKER = 1;
const DRUM_PHASE_OFFSET_STEP = 0.001;
const STEPS_IN_MEASURE = 16;

// --- ЛОКАЛЬНЫЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---
const isTrackMissing = (track) => !track;
const isPatternDataInvalid = (data) => !data || !Array.isArray(data.patterns);
const isStepInactive = (hitValue) => hitValue !== ACTIVE_HIT_MARKER;
const isNoteMissingInGrid = (item) => !item || !item.note;

/**
 * Парсинг строки синта '0:1:2' в сквозной абсолютный тик (шаг) проекта
 */
const parseSynthTimeToAbsoluteTick = (timeStr, measureIndex) => {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return measureIndex * STEPS_IN_MEASURE;

  const beats = parseInt(parts[1], 10) || 0;
  const sixteenths = parseInt(parts[2], 10) || 0;

  // 1 четверть = 4 шестнадцатых шага. Считаем сквозной адрес тика
  const stepInPattern = beats * 4 + sixteenths;
  return measureIndex * STEPS_IN_MEASURE + stepInPattern;
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

    const phaseOffset = drumIndex * DRUM_PHASE_OFFSET_STEP;
    // Считаем сквозной абсолютный шаг для барабана
    const absoluteTick = measureIndex * STEPS_IN_MEASURE + stepIndex;

    track.addNoteToTick(absoluteTick, { note, drumIndex }, phaseOffset);
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

  // Очищаем карту нот перед полной перезабивкой (только при физическом изменении нот в UI)
  track.clear();

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => !isNoteMissingInGrid(item))
      .forEach((item) => {
        const absoluteTick = parseSynthTimeToAbsoluteTick(
          item.time,
          measureIndex,
        );
        track.addNoteToTick(absoluteTick, item);
      });
  });
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (isTrackMissing(track) || isPatternDataInvalid(drumsData)) return;

  track.clear();

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    syncMeasureDrums(track, drumsInMeasure, measureIndex, drumNoteMap);
  });
};
