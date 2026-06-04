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
  updateInstrumentVolume,
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

  // Хранилище для сглаживания прошлых значений параметров, чтобы убрать треск (Lag Filter)
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

  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];
      if (synthInstance?.instrument && settings?.volume !== undefined) {
        updateInstrumentVolume(synthInstance.instrument, settings.volume);
      }
    });
  }, [soundSettings, synthEnginesRef]);

  // Конвейер матрицы модуляции LFO со встроенным подавлением щелчков и треска
  useEffect(() => {
    let animationFrameId;

    const runModulationPipeline = () => {
      // 1. Матрица модуляции для СИНТЕЗАТОРОВ
      SYNTH_LIST.forEach((name) => {
        const synthInstance = synthEnginesRef.current[name];
        const settings = soundSettings[name];
        if (!synthInstance || !settings) return;

        if (synthInstance.masterLfo) {
          if (settings.lfoRate !== undefined)
            synthInstance.masterLfo.frequency.value = settings.lfoRate;
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

          let targetModulated =
            baseValue + lfoPhase * (fullRange * 0.5 * currentDepth);
          targetModulated = Math.max(minVal, Math.min(maxVal, targetModulated));

          if (paramConfig.isTextParam) {
            targetModulated = Math.round(targetModulated);
          }

          // ФИКС ТРЕСКА: Программный инерционный фильтр (Линейная интерполяция)
          const cacheKey = `${name}_${targetParam}`;
          if (smoothedValuesRef.current[cacheKey] === undefined) {
            smoothedValuesRef.current[cacheKey] = targetModulated;
          }
          // Плавно подползаем к новому значению, стирая острые цифровые углы
          smoothedValuesRef.current[cacheKey] +=
            (targetModulated - smoothedValuesRef.current[cacheKey]) * 0.15;

          runtimeSettings[targetParam] = smoothedValuesRef.current[cacheKey];
        }

        applySynthEnvelope(synthInstance, runtimeSettings);
        applyDynamicBypass(name, synthInstance, runtimeSettings);
      });

      // 2. Матрица модуляции для БАРАБАНОВ ДРАМ-МАШИНЫ
      DRUM_KIT_LIST.forEach((name) => {
        const drumInstance = drumsEngineRef.current?.[name];
        const settings = soundSettings[name];
        if (!drumInstance || !settings) return;

        // Физически настраиваем независимое LFO этого конкретного барабана
        if (drumInstance.masterLfo) {
          if (settings.lfoRate !== undefined)
            drumInstance.masterLfo.frequency.value = settings.lfoRate;
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

          let targetModulated =
            baseValue + lfoPhase * (fullRange * 0.5 * currentDepth);
          targetModulated = Math.max(minVal, Math.min(maxVal, targetModulated));

          if (paramConfig.isTextParam) {
            targetModulated = Math.round(targetModulated);
          }

          // Применяем инерционное сглаживание и для параметров барабанов
          const cacheKey = `${name}_${targetParam}`;
          if (smoothedValuesRef.current[cacheKey] === undefined) {
            smoothedValuesRef.current[cacheKey] = targetModulated;
          }
          smoothedValuesRef.current[cacheKey] +=
            (targetModulated - smoothedValuesRef.current[cacheKey]) * 0.15;

          runtimeSettings[targetParam] = smoothedValuesRef.current[cacheKey];
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
