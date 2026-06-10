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
} from '../audio/playback/audioLifecycleActions';
import {
  setupDrumsPlayback,
  setupSynthPlayback,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from '../audio/playback/audioPlaybackActions';
import {
  initializeAudioRouting,
  updateInstrumentVolume,
} from '../audio/playback/audioModulationActions';
import { synthEnginesRegistry } from '../audio/sync/visualizerState';
import { processInstrumentLfoModulation } from './processInstrumentLfoModulation';

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
  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );

  const synthAnalysersRef = useRef({});
  const synthChannelsRef = useRef({});
  const smoothedValuesRef = useRef({});

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

  // ИСПРАВЛЕННЫЙ ХУК ГРОМКОСТИ: Крутит громкость напрямую внутри инстансов инструментов
  useEffect(() => {
    // 1. Громкость синтов (Твой оригинальный рабочий код)
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];
      if (synthInstance?.instrument && settings?.volume !== undefined) {
        updateInstrumentVolume(synthInstance.instrument, settings.volume);
      }
    });

    // 2. Громкость барабанов (Лезем напрямую во внутренний инструмент контейнера драмов!)
    DRUM_KIT_LIST.forEach((name) => {
      // Находим инстанс конкретного барабана (кик, снэр, хэт...) в рефе движка драмов
      const drumInstance = drumsEngineRef.current?.[name];
      const settings = soundSettings[name];

      // Если инстанс барабана и его внутренний инструмент существуют, и ручку крутанули в UI
      if (drumInstance?.instrument && settings?.volume !== undefined) {
        // Используем твою же универсальную функцию updateInstrumentVolume!
        // Она сама проверит наличие свойства .volume и плавно применит децибелы через .rampTo()
        updateInstrumentVolume(drumInstance.instrument, settings.volume);
      }
    });
  }, [soundSettings, synthEnginesRef, drumsEngineRef]); // Добавили drumsEngineRef в зависимости

  // Чистый конвейер модуляции LFO, избавленный от дублирования кода
  useEffect(() => {
    let animationFrameId;

    if (sequencerPlayState !== 'start') {
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    const runModulationPipeline = () => {
      SYNTH_LIST.forEach((name) => {
        processInstrumentLfoModulation({
          name,
          instance: synthEnginesRef.current[name],
          settings: soundSettings[name],
          smoothedValues: smoothedValuesRef.current,
        });
      });

      DRUM_KIT_LIST.forEach((name) => {
        processInstrumentLfoModulation({
          name,
          instance: drumsEngineRef.current?.[name],
          settings: soundSettings[name],
          smoothedValues: smoothedValuesRef.current,
        });
      });

      animationFrameId = requestAnimationFrame(runModulationPipeline);
    };

    animationFrameId = requestAnimationFrame(runModulationPipeline);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [soundSettings, synthEnginesRef, drumsEngineRef, sequencerPlayState]);

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
