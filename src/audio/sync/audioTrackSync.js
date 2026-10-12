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
 * НАСТОЯЩИЙ ИСПРАВЛЕННЫЙ ПАРСЕР: Из строки '0:1:2' собирает точный шаг внутри такта (beats * 4 + sixteenths)
 */
const parseSynthTimeToAbsoluteTick = (timeStr, measureIndex) => {
  const parts = timeStr.split(':');
  if (parts.length !== 3) return measureIndex * STEPS_IN_MEASURE;

  // Строка '0:1:2' -> parts[0] = такт, parts[1] = доля (0-3), parts[2] = микрошаг (0-3)
  const beats = parseInt(parts[1], 10) || 0;
  const sixteenths = parseInt(parts[2], 10) || 0;

  // В одной доле всегда ровно 4 шестнадцатых шага
  const stepInPattern = beats * 4 + sixteenths;

  // Возвращаем сквозной индекс шага на глобальном таймлайне проекта
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

  const temporaryContainer = {
    patternsMap: {},
    addNoteToTick(absoluteTick, noteData, phaseOffset) {
      const measureIndex = Math.floor(absoluteTick / 16);
      const stepIndexInMeasure = absoluteTick % 16;

      if (!temporaryContainer.patternsMap[measureIndex]) {
        temporaryContainer.patternsMap[measureIndex] = {};
      }
      temporaryContainer.patternsMap[measureIndex][stepIndexInMeasure] = {
        data: noteData,
        phaseOffset,
      };
    },
  };

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => !isNoteMissingInGrid(item))
      .forEach((item) => {
        const absoluteTick = parseSynthTimeToAbsoluteTick(
          item.time,
          measureIndex,
        );
        temporaryContainer.addNoteToTick(absoluteTick, item);
      });
  });

  // Атомарно подменяем матрицу синтов
  track.patternsMap = temporaryContainer.patternsMap;
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (isTrackMissing(track) || isPatternDataInvalid(drumsData)) return;

  const temporaryContainer = {
    patternsMap: {},
    addNoteToTick(absoluteTick, noteData, phaseOffset) {
      const measureIndex = Math.floor(absoluteTick / 16);
      const stepIndexInMeasure = absoluteTick % 16;

      if (!temporaryContainer.patternsMap[measureIndex]) {
        temporaryContainer.patternsMap[measureIndex] = {};
      }
      temporaryContainer.patternsMap[measureIndex][stepIndexInMeasure] = {
        data: noteData,
        phaseOffset,
      };
    },
  };

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    syncMeasureDrums(
      temporaryContainer,
      drumsInMeasure,
      measureIndex,
      drumNoteMap,
    );
  });

  // Атомарно подменяем карту барабанов
  track.patternsMap = temporaryContainer.patternsMap;
};
