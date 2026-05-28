import noteAndKeyMap from '../constants/noteAndKeyMap';
import { DEFAULT_DRUM_RELEASE, SYNTH_LIST } from '../constants/constants';
import { SYNTH_PARAMS } from '../constants/synthParamsConfig'; // Импортируем наш новый паспорт параметров
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
  synthEnginesRegistry,
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

    synthEnginesRegistry.current = synthEnginesRef.current;

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

        // ИСПРАВЛЕНИЕ МАРШРУТИЗАЦИИ:
        // Отключаем КОНЕЦ внутренней цепочки эффектов синта от мастера
        if (synthInstance.output) {
          synthInstance.output.disconnect();
          // И направляем этот ВЫХОД в наш изолированный канал громкости микшера
          synthInstance.output.connect(channel);
        }

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

  // УМНЫЙ EFFECT МОДУЛЯЦИИ: Автоматически крутит параметры и усыпляет эффекты в нуле
  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];

      if (synthInstance && settings) {
        // 1. Статичная базовая настройка Атаки огибающей синта
        if (synthInstance.instrument && typeof settings.attack === 'number') {
          synthInstance.instrument.set({
            envelope: {
              attack: settings.attack,
            },
          });
        }

        // 2. ДИНАМИЧЕСКИЙ АВТО-БАЙПАС: Бежим циклом по паспорту параметров
        Object.entries(SYNTH_PARAMS).forEach(([paramName, paramConfig]) => {
          // Если этот параметр помечен в конфиге как аудио-эффект
          if (paramConfig.isEffect && paramConfig.nodeKey) {
            const fxNode = synthInstance[paramConfig.nodeKey]; // Находим узел эффекта в контейнере синта
            const liveValue = settings[paramName]; // Берем его живое число из Redux

            if (fxNode && typeof liveValue === 'number') {
              // Плавно выставляем уровень микса эффекта (wet) через легальный метод .set()
              fxNode.set({
                wet: liveValue,
              });

              const isSilent = liveValue === 0;

              // === ЖЕЛЕЗОБЕТОННЫЙ МАРКЕР ПРОВЕРКИ АВТО-БАЙПАСА ===
              // Выводим сообщение в консоль только в момент ФАКТИЧЕСКОГО изменения режима
              // if (isSilent && !fxNode.bypassed) {
              //   console.log(
              //     `[AUDIO ENGINE]: Эффект ${paramConfig.label} для ${name} АППАРАТНО ВЫКЛЮЧЕН (Байпас активен). Процессор отдыхает.`,
              //   );
              // } else if (!isSilent && fxNode.bypassed) {
              //   console.log(
              //     `[AUDIO ENGINE]: Эффект ${paramConfig.label} для ${name} ПРОСНУЛСЯ. Включаем математические расчеты.`,
              //   );
              // }
              // ==================================================

              // Железное правило оптимизации: если ручка ровно в 0 — аппаратно тушим вычисления эффекта в процессоре
              fxNode.bypassed = isSilent;
            }
          }
        });
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
