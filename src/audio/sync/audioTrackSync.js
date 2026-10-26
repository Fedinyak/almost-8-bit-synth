import {
  processMeasureSynthGroup,
  processMeasureDrumsGroup,
} from './audioTrackGridParser';

export { setupSynthPlayback, setupDrumsPlayback } from './audioTrackLifecycle';

const isTrackMissing = (track) => !track;
const isPatternDataInvalid = (data) => !data || !Array.isArray(data.patterns);
const isMissing = (target) => !target;

/**
 * Конвейер разбора и синхронизации нотной матрицы синтезатора (Абсолютно плоский вид)
 */
export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (isTrackMissing(track) || isPatternDataInvalid(instrumentData)) return;

  const nextPatternsMap = {};
  let measureIndex = 0;

  // Кристально чистый линейный цикл по тактам синта
  for (const patternGrid of instrumentData.patterns) {
    processMeasureSynthGroup(nextPatternsMap, patternGrid, measureIndex);
    measureIndex++;
  }

  track.patternsMap = nextPatternsMap;
};

/**
 * Конвейер разбора и синхронизации шагов сетки барабанов (Абсолютно плоский вид)
 */
export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (isTrackMissing(track) || isPatternDataInvalid(drumsData)) return;

  const nextPatternsMap = {};
  let measureIndex = 0;

  // Кристально чистый линейный цикл по тактам барабанов
  for (const drumsInMeasure of drumsData.patterns) {
    if (!isMissing(drumsInMeasure)) {
      processMeasureDrumsGroup(
        nextPatternsMap,
        drumsInMeasure,
        measureIndex,
        drumNoteMap,
      );
    }
    measureIndex++;
  }

  track.patternsMap = nextPatternsMap;
};

/**
 * Агрегирующий конвейер синхронизации всех паттернов проекта
 */
export const syncPatternsToAudioTracks = ({
  synthPart,
  drumsPart,
  synthData,
  drumsList,
  SYNTH_LIST,
  drumNoteMap,
}) => {
  SYNTH_LIST.forEach((synthName) => {
    syncInstrumentPatternsToTrack(synthPart[synthName], synthData[synthName]);
  });

  syncDrumPatternsToTrack(drumsPart, drumsList, drumNoteMap);
};
