import noteAndKeyMap from '../constants/noteAndKeyMap';
import { DEFAULT_DRUM_RELEASE, SYNTH_LIST } from '../constants/constants';
import { useSelector } from 'react-redux';
import { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import {
  initializeDrums,
  initializeSynths,
  setupDrumsPlayback,
  setupSynthPlayback,
  stopAllAudio,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from '../utility/audioEngineActions';
import {
  synthAnalysers,
  resetSynthAnalysers,
} from '../utility/visualizerState'; // Импортируем наш изолированный реестр

const drumNoteMap = noteAndKeyMap.drumNoteMap;

export const useAudioEngineSync = (
  synthEnginesRef,
  synthPartRef,
  drumsEngineRef,
  drumsPartRef,
) => {
  const synthData = useSelector((state) => state.patterns.synthData);
  const drumsList = useSelector((state) => state.patterns.drumsData);

  // Безопасная подписка на новый слайс настроек звука
  const soundSettings = useSelector(
    (state) => state.soundSettings?.synths || {},
  );

  const synthAnalysersRef = useRef({});
  // Хранилище для промежуточных каналов, чтобы вовремя удалять их из памяти
  const synthChannelsRef = useRef({});

  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);

    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];

      if (synthInstance && !synthAnalysersRef.current[name]) {
        // 1. Создаем изолированный канал громкости для синта
        const channel = new Tone.Volume();

        // 2. Создаем анализатор
        const analyser = new Tone.Analyser({
          type: 'waveform',
          size: 32,
        });

        // 3. Отключаем синт от общего мастера и перенаправляем в наш канал
        synthInstance.disconnect();
        synthInstance.connect(channel);

        // 4. Канал пускает звук в анализатор и на мастер-выход
        channel.connect(analyser);
        channel.toDestination();

        // Сохраняем ссылки в рефы
        synthChannelsRef.current[name] = channel;
        synthAnalysersRef.current[name] = analyser;

        // Сохраняем ссылку в наш чистый shared-реестр вместо window
        synthAnalysers[name] = analyser;
      }
    });
  }, [drumsEngineRef, synthEnginesRef]);

  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];

      if (synthInstance && settings) {
        // 1. Настройка Атаки синта
        synthInstance.set({
          envelope: {
            attack: settings.attackMode === 1 ? 0.5 : 0.005,
          },
        });

        // 2. ИСПРАВЛЕНИЕ: Настройка Биткрашера через чистый метод .set()
        // Это убирает ошибку "mutates a variable that React considers immutable"
        if (synthInstance.fxBitcrusher) {
          synthInstance.fxBitcrusher.set({
            wet: settings.bitcrusherOn ? 1 : 0,
          });
        }
      }
    });
  }, [soundSettings, synthEnginesRef]);

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
      // Очищаем анализаторы
      Object.values(synthAnalysersRef.current).forEach((analyser) => {
        if (analyser && !analyser.disposed) analyser.dispose();
      });
      synthAnalysersRef.current = {};

      // Вычищаем ссылки из синглтон-реестра visualizerState
      resetSynthAnalysers();

      // Очищаем каналы
      Object.values(synthChannelsRef.current).forEach((channel) => {
        if (channel && !channel.disposed) channel.dispose();
      });
      synthChannelsRef.current = {};

      stopAllAudio({
        synths: synthEnginesRef,
        parts: synthPartRef,
        drumsEngine: drumsEngineRef,
        drumsPart: drumsPartRef,
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
