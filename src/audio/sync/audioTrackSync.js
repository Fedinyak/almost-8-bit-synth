import { PlaybackTrack } from '../core/playbackTrack';
import { processDrumPlaybackHit, playSynthNote } from './audioEngineTriggers';
import { scheduler } from '../core/scheduler';
import {
  getStepsPerPattern,
  calculateMeasureIndex,
  calculateStepIndexInMeasure,
  parseSynthTimeToAbsoluteTick,
} from '../../utils/audioMathUtils';

// --- ВНУТРЕННИЕ СИСТЕМНЫЕ КОНСТАНТЫ ---
const ACTIVE_HIT_MARKER = 1;
const DRUM_PHASE_OFFSET_STEP = 0.001;

// --- ВАЛИДАТОРЫ И ПРЕДИКАТЫ ---
const isTrackMissing = (track) => !track;
const isPatternDataInvalid = (data) => !data || !Array.isArray(data.patterns);
const isStepInactive = (hitValue) => hitValue !== ACTIVE_HIT_MARKER;
const isNoteMissing = (item) => !item || !item.note;

// --- МЕНЕДЖМЕНТ СТРУКТУРЫ ДАННЫХ И ЖИЗНЕННОГО ЦИКЛА ---

const ensureContainerStepArray = (patternsMap, measureIndex, stepIndex) => {
  if (!patternsMap[measureIndex]) {
    patternsMap[measureIndex] = {};
  }
  if (!patternsMap[measureIndex][stepIndex]) {
    patternsMap[measureIndex][stepIndex] = [];
  }
};

const createTemporaryPatternContainer = () => {
  const container = {
    patternsMap: {},
    addNoteToTick(absoluteTick, noteData, phaseOffset) {
      const measureIndex = calculateMeasureIndex(absoluteTick);
      const stepIndexInMeasure = calculateStepIndexInMeasure(absoluteTick);
      const eventPayload = { data: noteData, phaseOffset };

      ensureContainerStepArray(
        container.patternsMap,
        measureIndex,
        stepIndexInMeasure,
      );
      container.patternsMap[measureIndex][stepIndexInMeasure].push(
        eventPayload,
      );
    },
  };
  return container;
};

const bindTrackLifecycleToScheduler = (track) => {
  scheduler.registerTrack(track);

  const originalDispose = track.dispose;
  track.dispose = () => {
    scheduler.unregisterTrack(track);
    originalDispose();
  };
};

// --- КОНВЕЙЕРЫ ИТЕРАЦИИ ПАТТЕРНОВ (БЕЗ ALLOCATION) ---

const processSingleDrumTrackSteps = (
  track,
  trackSteps,
  measureIndex,
  drumIndex,
  note,
) => {
  const totalSteps = trackSteps.length;
  const stepsPerPattern = getStepsPerPattern();

  for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
    if (isStepInactive(trackSteps[stepIndex])) continue;

    const phaseOffset = drumIndex * DRUM_PHASE_OFFSET_STEP;
    const absoluteTick = measureIndex * stepsPerPattern + stepIndex;

    track.addNoteToTick(absoluteTick, { note, drumIndex }, phaseOffset);
  }
};

const processMeasureDrumsGroup = (
  track,
  drumsInMeasure,
  measureIndex,
  drumNoteMap,
) => {
  const drumEntries = Object.entries(drumsInMeasure);
  const entriesCount = drumEntries.length;

  for (let drumIndex = 0; drumIndex < entriesCount; drumIndex++) {
    const [drumName] = drumEntries[drumIndex];
    const trackSteps = drumsInMeasure[drumName];
    const note = drumNoteMap[drumName];

    if (isNoteMissing({ note })) continue;
    if (!Array.isArray(trackSteps)) continue;

    processSingleDrumTrackSteps(
      track,
      trackSteps,
      measureIndex,
      drumIndex,
      note,
    );
  }
};

// --- ПУБЛИЧНЫЙ API СИНХРОНИЗАЦИИ ---

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  const track = PlaybackTrack((time, noteData) => {
    const engine = enginesRef[synthName];
    if (engine) playSynthNote(engine, time, noteData);
  });

  bindTrackLifecycleToScheduler(track);
  tracksRef[synthName] = track;
};

export const setupDrumsPlayback = (
  drumsEngineRef,
  drumsTrackRef,
  drumNoteMap,
  release,
) => {
  if (drumsTrackRef.current) return;

  const track = PlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (engine)
      processDrumPlaybackHit(time, noteData, engine, drumNoteMap, release);
  });

  bindTrackLifecycleToScheduler(track);
  drumsTrackRef.current = track;
};

export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (isTrackMissing(track) || isPatternDataInvalid(instrumentData)) return;

  const container = createTemporaryPatternContainer();
  const measuresCount = instrumentData.patterns.length;

  for (let measureIndex = 0; measureIndex < measuresCount; measureIndex++) {
    const patternGrid = instrumentData.patterns[measureIndex];
    if (!Array.isArray(patternGrid)) continue;

    const gridLength = patternGrid.length;
    for (let itemIndex = 0; itemIndex < gridLength; itemIndex++) {
      const item = patternGrid[itemIndex];
      if (isNoteMissing(item)) continue;

      const absoluteTick = parseSynthTimeToAbsoluteTick(
        item.time,
        measureIndex,
      );
      container.addNoteToTick(absoluteTick, item);
    }
  }

  track.patternsMap = container.patternsMap;
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (isTrackMissing(track) || isPatternDataInvalid(drumsData)) return;

  const container = createTemporaryPatternContainer();
  const measuresCount = drumsData.patterns.length;

  for (let measureIndex = 0; measureIndex < measuresCount; measureIndex++) {
    const drumsInMeasure = drumsData.patterns[measureIndex];
    if (!drumsInMeasure) continue;

    processMeasureDrumsGroup(
      container,
      drumsInMeasure,
      measureIndex,
      drumNoteMap,
    );
  }

  track.patternsMap = container.patternsMap;
};
