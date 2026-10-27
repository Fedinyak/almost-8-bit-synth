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
} from '../audio/context/audioLifecycleActions';
import {
  setupDrumsPlayback,
  setupSynthPlayback,
  syncPatternsToAudioTracks,
} from '../audio/bridge/audioPlaybackActions';
import {
  initializeAudioRouting,
  syncAllVolumes,
  syncAllPans,
} from '../audio/bridge/audioModulationActions';
import { syncAllEnvelopes } from '../audio/bridge/instrumentEnvelopeActions';
import { synthEnginesRegistry } from '../audio/timeline/sync/visualizerState';

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
  const bpm = useSelector((state) => state.player.bpm);

  const synthAnalysersRef = useRef({});
  const synthChannelsRef = useRef({});
  const smoothedValuesRef = useRef({});

  // Жизненный цикл 1: Первичная жесткая инициализация чипа
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
  }, []);

  // Жизненный цикл 2: Управление громкостью, стерео-панорамой и огибающими ADSR на каналах рэка
  useEffect(() => {
    syncAllVolumes({
      synthEngines: synthEnginesRef.current,
      drumsEngine: drumsEngineRef.current,
      soundSettings,
      SYNTH_LIST,
      DRUM_KIT_LIST,
    });

    syncAllPans({
      synthEngines: synthEnginesRef.current,
      drumsEngine: drumsEngineRef.current,
      soundSettings,
      SYNTH_LIST,
      DRUM_KIT_LIST,
    });

    // СКВОЗНАЯ КОММУТАЦИЯ: Доставляем параметры огибающих во все нативные ядра
    syncAllEnvelopes({
      synthEngines: synthEnginesRef.current,
      drumsEngine: drumsEngineRef.current,
      soundSettings,
      SYNTH_LIST,
      DRUM_KIT_LIST,
    });
  }, [soundSettings, synthEnginesRef, drumsEngineRef]);

  // Жизненный цикл 4: Установка дорожек воспроизведения и сборка ресурсов
  useEffect(() => {
    const synthListTotal = SYNTH_LIST.length;
    for (let i = 0; i < synthListTotal; i++) {
      setupSynthPlayback(
        SYNTH_LIST[i],
        synthEnginesRef.current,
        synthPartRef.current,
      );
    }

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
  }, []);

  // Жизненный цикл 5: Забивка нотных матриц при мутации паттернов или изменении темпа
  useEffect(() => {
    syncPatternsToAudioTracks({
      synthPart: synthPartRef.current,
      drumsPart: drumsPartRef.current,
      synthData,
      drumsList,
      SYNTH_LIST,
      drumNoteMap,
    });
  }, [synthData, drumsList, drumsPartRef, synthPartRef, bpm]);
};
