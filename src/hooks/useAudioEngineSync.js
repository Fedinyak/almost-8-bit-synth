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

// --- НА ТИВНАЯ ЗАЧИСТКА TONE.JS (ШАГ 1: ОТКЛЮЧЕНИЕ LFO-КОНВЕЙЕРА) ---
// Комментируем оригинальный импорт конвейера модуляции эффектов
// import { processInstrumentLfoModulation } from '../audio/core/processInstrumentLfoModulation.js';

const drumNoteMap = noteAndKeyMap.drumNoteMap;

const syncAllVolumes = ({ synthEngines, drumsEngine, soundSettings }) => {
  SYNTH_LIST.forEach((name) => {
    const synthInstance = synthEngines[name];
    const settings = soundSettings[name];
    if (synthInstance?.instrument && settings?.volume !== undefined) {
      updateInstrumentVolume(synthInstance.instrument, settings.volume);
    }
  });

  DRUM_KIT_LIST.forEach((name) => {
    const drumInstance = drumsEngine?.[name];
    const settings = soundSettings[name];
    if (drumInstance?.instrument && settings?.volume !== undefined) {
      updateInstrumentVolume(drumInstance.instrument, settings.volume);
    }
  });
};

// Комментируем внутренний пайплайн запуска модуляции
/*
const runLfoModulationPipeline = ({
  synthEngines,
  drumsEngine,
  soundSettings,
  smoothedValues,
}) => {
  SYNTH_LIST.forEach((name) => {
    processInstrumentLfoModulation({
      name,
      instance: synthEngines[name],
      settings: soundSettings[name],
      smoothedValues,
    });
  });

  DRUM_KIT_LIST.forEach((name) => {
    processInstrumentLfoModulation({
      name,
      instance: drumsEngine?.[name],
      settings: soundSettings[name],
      smoothedValues,
    });
  });
};
*/

const syncPatternsToAudioTracks = ({
  synthPart,
  drumsPart,
  synthData,
  drumsList,
}) => {
  SYNTH_LIST.forEach((synthName) => {
    syncInstrumentPatternsToTrack(synthPart[synthName], synthData[synthName]);
  });

  syncDrumPatternsToTrack(drumsPart, drumsList, drumNoteMap);
};

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
  const bpm = useSelector((state) => state.player.bpm);

  const synthAnalysersRef = useRef({});
  const synthChannelsRef = useRef({});
  const smoothedValuesRef = useRef({});

  // =========================================================================
  // ИСПРАВЛЕНО: Железный замок на Жизненный цикл 1
  // Инициализируем аудио-чип строго один раз при монтировании Groovebox.
  // Пустой массив [] гарантирует, что ручки крутилок не вызовут повторный запуск.
  // =========================================================================
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
    // Оригинальные зависимости закомментированы для безопасности:
    // }, [drumsEngineRef, synthEnginesRef]);
  }, []);

  // Жизненный цикл 2: Управление громкостью на мейне
  useEffect(() => {
    syncAllVolumes({
      synthEngines: synthEnginesRef.current,
      drumsEngine: drumsEngineRef.current,
      soundSettings,
    });
  }, [soundSettings, synthEnginesRef, drumsEngineRef]);

  // =========================================================================
  // ЗАКОММЕНТИРОВАНО: Жизненный цикл 3 — Высокочастотный конвейер LFO модуляции
  // Полностью обесточиваем петлю requestAnimationFrame, разгружая процессор
  // =========================================================================
  /*
  useEffect(() => {
    let animationFrameId;

    if (sequencerPlayState !== 'start') {
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }

    const loop = () => {
      runLfoModulationPipeline({
        synthEngines: synthEnginesRef.current,
        drumsEngine: drumsEngineRef.current,
        soundSettings,
        smoothedValues: smoothedValuesRef.current,
      });
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [soundSettings, synthEnginesRef, drumsEngineRef, sequencerPlayState]);
  */

  // =========================================================================
  // ИСПРАВЛЕНО: Железный замок на Жизненный цикл 4
  // Подготовка дорожек воспроизведения и сборка мусора происходят один раз.
  // Функция stopAllAudio сработает только тогда, когда пользователь закроет вкладку/приложение.
  // =========================================================================
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
    // Оригинальные зависимости закомментированы:
    // }, [drumsEngineRef, drumsPartRef, synthEnginesRef, synthPartRef]);
  }, []);

  // Жизненный цикл 5: Забивка нотных матриц при мутации паттернов или изменении темпа
  useEffect(() => {
    syncPatternsToAudioTracks({
      synthPart: synthPartRef.current,
      drumsPart: drumsPartRef.current,
      synthData,
      drumsList,
    });
  }, [synthData, drumsList, drumsPartRef, synthPartRef, bpm]);
};
