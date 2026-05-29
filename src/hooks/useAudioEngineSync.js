import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  DEFAULT_DRUM_RELEASE,
  SYNTH_LIST,
  DRUM_KIT_LIST,
} from '../constants/constants';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import {
  initializeDrums,
  initializeSynths,
  stopAllAudio,
} from '../utility/audioLifecycleActions';
import {
  setupDrumsPlayback,
  setupSynthPlayback,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from '../utility/audioPlaybackActions';
import {
  initializeAudioRouting,
  applySynthEnvelope,
  applyDynamicBypass,
} from '../utility/audioModulationActions';
import { synthEnginesRegistry } from '../utility/visualizerState';

const drumNoteMap = noteAndKeyMap.drumNoteMap;

export const useAudioEngineSync = (
  synthEnginesRef,
  synthPartRef,
  drumsEngineRef,
  drumsPartRef,
) => {
  const synthData = useSelector((state) => state.patterns.synthData);
  const drumsList = useSelector((state) => state.patterns.drumsData);
  const soundSettings = useSelector(
    (state) => state.soundSettings?.synths || {},
  );

  const synthAnalysersRef = useRef({});
  const synthChannelsRef = useRef({});

  // 1. Инициализация движков
  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);

    synthEnginesRegistry.current = synthEnginesRef.current;

    initializeAudioRouting(
      SYNTH_LIST,
      synthEnginesRef,
      synthChannelsRef,
      synthAnalysersRef,
    );
  }, [drumsEngineRef, synthEnginesRef]);

  // 2. ДИНАМИЧЕСКИЙ LIVE-КОНТРОЛЬ И АВТО-БАЙПАС (И для синтов, и для барабанов!)
  useEffect(() => {
    // Шаг А: Крутим ручки у Мелодических Синтезаторов
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];

      if (!synthInstance || !settings) return;

      applySynthEnvelope(synthInstance, settings.attack);
      applyDynamicBypass(name, synthInstance, settings);
    });

    // Шаг Б: Крутим точно такие же ручки эффектов у БАРАБАНОВ
    DRUM_KIT_LIST.forEach((name) => {
      // Забираем контейнер конкретного барабана (kick, snare) из драм-рефа
      const drumInstance = drumsEngineRef.current?.[name];
      const settings = soundSettings[name];

      if (!drumInstance || !settings) return;

      // Применяем атаку огибающей и динамический авто-байпас эффектов к барабану.
      // Код модуляции сработает нативно, ведь структура контейнеров полностью совпадает!
      applySynthEnvelope(drumInstance, settings.attack);
      applyDynamicBypass(name, drumInstance, settings);
    });
  }, [soundSettings, synthEnginesRef, drumsEngineRef]);

  // 3. Воспроизведение и очистка памяти
  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      setupSynthPlayback(name, synthEnginesRef.current, synthPartRef.current);
    });

    setupDrumsPlayback(
      drumsEngineRef,
      drumsPartRef,
      drumNoteMap,
      DEFAULT_DRUM_RELEASE,
    );

    return () => {
      stopAllAudio({
        synths: synthEnginesRef,
        parts: synthPartRef,
        drumsEngine: drumsEngineRef,
        drumsPart: drumsPartRef,
        synthAnalysersRef,
        synthChannelsRef,
      });
    };
  }, [drumsEngineRef, drumsPartRef, synthEnginesRef, synthPartRef]);

  // 4. Синхронизация паттернов секвенсора
  useEffect(() => {
    SYNTH_LIST.forEach((synthName) => {
      syncInstrumentPatternsToTrack(
        synthPartRef.current[synthName],
        synthData[synthName],
      );
    });

    syncDrumPatternsToTrack(drumsPartRef.current, drumsList, drumNoteMap);
  }, [synthData, drumsList, drumsPartRef, synthPartRef]);
};
