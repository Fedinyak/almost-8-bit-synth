import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  DEFAULT_DRUM_RELEASE,
  SYNTH_LIST,
  DRUM_KIT_LIST,
} from '../constants/constants';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import { SOUND_PARAMS } from '../constants/soundParamsConfig';
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

  // Высокоточный JS-конвейер матрицы модуляции LFO
  useEffect(() => {
    let animationFrameId;

    const runModulationPipeline = () => {
      // 1. Модуляция для линии синтезаторов
      SYNTH_LIST.forEach((name) => {
        const synthInstance = synthEnginesRef.current[name];
        const settings = soundSettings[name];
        if (!synthInstance || !settings) return;

        if (synthInstance.masterLfo) {
          if (settings.lfoRate !== undefined) {
            synthInstance.masterLfo.frequency.value = settings.lfoRate;
          }
          if (
            settings.lfoWaveform !== undefined &&
            synthInstance.masterLfo.type !== settings.lfoWaveform
          ) {
            synthInstance.masterLfo.type = settings.lfoWaveform;
          }
        }

        let runtimeSettings = { ...settings };

        if (
          settings.lfoActive &&
          synthInstance.masterLfoMeter &&
          settings.lfoTarget
        ) {
          const targetParam = settings.lfoTarget;
          const lfoPhase = synthInstance.masterLfoMeter.getValue();
          const currentDepth = settings.lfoDepth ?? 0.5;

          const paramConfig = SOUND_PARAMS[targetParam] || { min: 0, max: 1 };
          const minVal = paramConfig.min ?? 0;
          const maxVal = paramConfig.max ?? 1;
          const fullRange = maxVal - minVal;

          const baseValue = settings[targetParam] ?? paramConfig.default ?? 0;

          // Вычисляем модулированное значение
          let modulatedValue =
            baseValue + lfoPhase * (fullRange * 0.5 * currentDepth);
          modulatedValue = Math.max(minVal, Math.min(maxVal, modulatedValue));

          // КРИТИЧЕСКИЙ ФИКС ДЛЯ ТЕКСТОВЫХ ПАРАМЕТРОВ:
          // Если параметр является текстовым (индексом словаря), принудительно округляем до целого числа
          if (paramConfig.isTextParam) {
            modulatedValue = Math.round(modulatedValue);
          }

          runtimeSettings[targetParam] = modulatedValue;
        }

        applySynthEnvelope(synthInstance, runtimeSettings);
        applyDynamicBypass(name, synthInstance, runtimeSettings);
      });

      // 2. Модуляция для драм-рэка
      DRUM_KIT_LIST.forEach((name) => {
        const drumInstance = drumsEngineRef.current?.[name];
        const settings = soundSettings[name];
        if (!drumInstance || !settings) return;

        if (drumInstance.masterLfo) {
          if (settings.lfoRate !== undefined) {
            drumInstance.masterLfo.frequency.value = settings.lfoRate;
          }
          if (
            settings.lfoWaveform !== undefined &&
            drumInstance.masterLfo.type !== settings.lfoWaveform
          ) {
            drumInstance.masterLfo.type = settings.lfoWaveform;
          }
        }

        let runtimeSettings = { ...settings };

        if (
          settings.lfoActive &&
          drumInstance.masterLfoMeter &&
          settings.lfoTarget
        ) {
          const targetParam = settings.lfoTarget;
          const lfoPhase = drumInstance.masterLfoMeter.getValue();
          const currentDepth = settings.lfoDepth ?? 0.5;

          const paramConfig = SOUND_PARAMS[targetParam] || { min: 0, max: 1 };
          const minVal = paramConfig.min ?? 0;
          const maxVal = paramConfig.max ?? 1;
          const fullRange = maxVal - minVal;

          const baseValue = settings[targetParam] ?? paramConfig.default ?? 0;

          let modulatedValue =
            baseValue + lfoPhase * (fullRange * 0.5 * currentDepth);
          modulatedValue = Math.max(minVal, Math.min(maxVal, modulatedValue));

          if (paramConfig.isTextParam) {
            modulatedValue = Math.round(modulatedValue);
          }

          runtimeSettings[targetParam] = modulatedValue;
        }

        applySynthEnvelope(drumInstance, runtimeSettings);
        applyDynamicBypass(name, drumInstance, runtimeSettings);
      });

      animationFrameId = requestAnimationFrame(runModulationPipeline);
    };

    animationFrameId = requestAnimationFrame(runModulationPipeline);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [soundSettings, synthEnginesRef, drumsEngineRef]);

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
