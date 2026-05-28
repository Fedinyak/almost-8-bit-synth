import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { DEFAULT_DRUM_RELEASE, SYNTH_LIST } from '../constants/constants';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import { SYNTH_PARAMS } from '../constants/synthParamsConfig';
import {
  initializeDrums,
  initializeSynths,
  setupDrumsPlayback,
  setupSynthPlayback,
  stopAllAudio,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
  createAudioChannel,
  createAudioAnalyser,
  connectSynthToMixer,
} from '../utility/audioEngineActions';
import {
  synthAnalysers,
  synthEnginesRegistry,
} from '../utility/visualizerState';

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

  // 1. Первичная инициализация движков и маршрутизация аудио-графа микшера
  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);

    synthEnginesRegistry.current = synthEnginesRef.current;

    // Декларативно настраиваем маршрутизацию для списка инструментов
    initializeAudioRouting(
      synthEnginesRef,
      synthChannelsRef,
      synthAnalysersRef,
    );
  }, [drumsEngineRef, synthEnginesRef]);

  // 2. Динамический LIVE-контроль параметров и аппаратный авто-байпас эффектов
  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];

      if (!synthInstance || !settings) return;

      applySynthEnvelope(synthInstance, settings.attack);
      applyDynamicBypass(name, synthInstance, settings);
    });
  }, [soundSettings, synthEnginesRef]);

  // 3. Запуск воспроизведения и глобальная очистка памяти при размонтировании
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

  // 4. Декларативная синхронизация сетки нот и паттернов секвенсора
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

/**
 * Локальные вспомогательные стрелочные функции модуляции и инициализации
 */

const initializeAudioRouting = (enginesRef, channelsRef, analysersRef) => {
  SYNTH_LIST.forEach((name) => {
    const synthInstance = enginesRef.current[name];
    if (!synthInstance || analysersRef.current[name]) return;

    const channel = createAudioChannel();
    const analyser = createAudioAnalyser();

    connectSynthToMixer(synthInstance, channel, analyser);

    channelsRef.current[name] = channel;
    analysersRef.current[name] = analyser;
    synthAnalysers[name] = analyser;
  });
};

const applySynthEnvelope = (synthInstance, attack) => {
  if (!synthInstance.instrument || typeof attack !== 'number') return;

  synthInstance.instrument.set({
    envelope: { attack },
  });
};

// 1. Изменение уровня микса эффекта в Tone.js
const updateEffectMix = (fxNode, value) => {
  fxNode.set({ wet: value });
};

// 2. Расчет необходимости байпаса на основе значения из паспорта
const checkBypassCondition = (liveValue, bypassValue) => {
  const targetBypassValue = typeof bypassValue === 'number' ? bypassValue : 0;
  return liveValue === targetBypassValue;
};

// 3. Переключение режима активности узла и вывод логов изменений
const toggleNodeBypass = (fxNode, shouldBypass, label, synthName) => {
  if (shouldBypass && !fxNode.bypassed) {
    console.log(
      `[⚡ BYPASS ON]: Эффект "${label}" для ${synthName} усыплен. ЦП отдыхает.`,
    );
  } else if (!shouldBypass && fxNode.bypassed) {
    console.log(
      `[🔊 BYPASS OFF]: Эффект "${label}" для ${synthName} проснулся.`,
    );
  }

  fxNode.bypassed = shouldBypass;
};

// Декларативный обход паспорта параметров
const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SYNTH_PARAMS).forEach(([paramName, paramConfig]) => {
    if (!paramConfig.isEffect || !paramConfig.nodeKey) return;

    const fxNode = synthInstance[paramConfig.nodeKey];
    const liveValue = settings[paramName];
    if (!fxNode || typeof liveValue !== 'number') return;

    // Шаг А: Мгновенно крутим звук
    updateEffectMix(fxNode, liveValue);

    // Шаг Б: Проверяем, нужно ли усыпить эффект
    const shouldBypass = checkBypassCondition(
      liveValue,
      paramConfig.bypassValue,
    );

    // Шаг В: Переключаем физику узла
    toggleNodeBypass(fxNode, shouldBypass, paramConfig.label, synthName);
  });
};
