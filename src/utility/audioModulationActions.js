import * as Tone from 'tone';
import { checkBypassCondition } from './audioMathUtils';
import { synthAnalysers } from './visualizerState';
// ДОБАВЛЕН ИМПОРТ ТЕКСТОВЫХ СЛОВАРЕЙ ИЗ ПАСПОРТА КОНФИГА
import {
  SOUND_PARAMS,
  EFFECT_DEVICES,
  TEXT_PARAM_DICTIONARIES,
} from '../constants/soundParamsConfig';
import {
  ANALYSER_TYPE,
  ANALYSER_SIZE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../constants/audioEngineConfig';

export const createAudioChannel = () => new Tone.Volume();

export const createAudioAnalyser = () =>
  new Tone.Analyser({ type: ANALYSER_TYPE, size: ANALYSER_SIZE });

export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (!synthInstance?.output) return;

  synthInstance.output.disconnect();
  synthInstance.output.connect(channel);

  channel.connect(analyser);
  channel.toDestination();
};

export const initializeAudioRouting = (
  synthList,
  enginesRef,
  channelsRef,
  analysersRef,
) => {
  synthList.forEach((name) => {
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

export const updateInstrumentVolume = (instrument, volumeValue) => {
  if (instrument?.volume) {
    // Декларативное сглаживание общей громкости для предотвращения щелчков
    if (typeof instrument.volume.rampTo === 'function') {
      instrument.volume.rampTo(volumeValue ?? AUDIO_DEFAULT_VOLUME, 0.05);
    } else {
      instrument.volume.value = volumeValue ?? AUDIO_DEFAULT_VOLUME;
    }
  }
};

const updateMetalSynthEnvelope = (instrument, attack, decay) => {
  instrument.set({
    envelope: { attack, decay },
  });
};

const updateStandardSynthEnvelope = (
  instrument,
  attack,
  decay,
  sustain,
  release,
) => {
  instrument.envelope.set({ attack, decay, sustain, release });
};

const updatePercussiveSynthEnvelope = (instrument, attack, decay, release) => {
  instrument.envelope.set({ attack, decay, release });
};

export const updateInstrumentEnvelope = (instrument, settings) => {
  if (!instrument) return;

  const attack = settings.attack ?? AUDIO_DEFAULT_ATTACK;
  const decay = settings.decay ?? AUDIO_DEFAULT_DECAY;
  const sustain = settings.sustain ?? AUDIO_DEFAULT_SUSTAIN;
  const release = settings.release ?? AUDIO_DEFAULT_RELEASE;

  if (settings.synthGlide !== undefined && instrument.name !== 'MetalSynth') {
    instrument.portamento = settings.synthGlide;
  }

  // ПОДДЕРЖКА DETUNE ДЛЯ ВСЕХ СИНТОВ: Плавно расстраиваем осциллятор
  if (settings.detune !== undefined && instrument.detune) {
    if (typeof instrument.detune.rampTo === 'function') {
      instrument.detune.rampTo(settings.detune, 0.05);
    } else {
      instrument.detune.value = settings.detune;
    }
  }

  // Если это СИНТ (MonoSynth) — крутим параметры его ВНУТРЕННЕГО фильтра
  if (settings.filterQ !== undefined && instrument.filter) {
    if (typeof instrument.filter.Q.rampTo === 'function') {
      instrument.filter.Q.rampTo(settings.filterQ, 0.05);
    } else {
      instrument.filter.Q.value = settings.filterQ;
    }
  }

  if (settings.filterEnvOctaves !== undefined && instrument.filterEnvelope) {
    instrument.filterEnvelope.octaves = settings.filterEnvOctaves;
  }

  if (instrument.name === 'MetalSynth') {
    updateMetalSynthEnvelope(instrument, attack, decay);
    return;
  }

  if (instrument.envelope) {
    if (instrument.envelope.sustain !== undefined) {
      updateStandardSynthEnvelope(instrument, attack, decay, sustain, release);
    } else {
      updatePercussiveSynthEnvelope(instrument, attack, decay, release);
    }
  }
};

export const applySynthEnvelope = (synthInstance, settings) => {
  const nativeInstrument = synthInstance?.instrument;
  if (!nativeInstrument || !settings) return;

  // Крутим встроенную панораму инструмента, не ломая внешние провода и микшер
  if (settings.pan !== undefined && synthInstance.panner?.pan) {
    synthInstance.panner.pan.value = settings.pan;
  }

  // Если это БАРАБАН — у него есть ВНЕШНИЙ фильтр fxFilter в контейнере эффектов!
  if (synthInstance.fxFilter) {
    if (
      settings.filterCutoff !== undefined &&
      synthInstance.fxFilter.frequency
    ) {
      if (typeof synthInstance.fxFilter.frequency.rampTo === 'function') {
        synthInstance.fxFilter.frequency.rampTo(settings.filterCutoff, 0.05);
      } else {
        synthInstance.fxFilter.frequency.value = settings.filterCutoff;
      }
    }
    if (settings.filterQ !== undefined && synthInstance.fxFilter.Q) {
      if (typeof synthInstance.fxFilter.Q.rampTo === 'function') {
        synthInstance.fxFilter.Q.rampTo(settings.filterQ, 0.05);
      } else {
        synthInstance.fxFilter.Q.value = settings.filterQ;
      }
    }
  }

  updateInstrumentVolume(nativeInstrument, settings.volume);
  updateInstrumentEnvelope(nativeInstrument, settings);
};
export const updateEffectParam = (fxNode, targetParam, value) => {
  if (!fxNode || !targetParam) return;

  // 1. Декларативная обработка комплексных параметров через метод .set()
  if (targetParam === 'wet') {
    fxNode.set({ wet: value });
    return;
  }

  // ЧИСТЫЙ АВТО-СТАРТ БЕЗ ХАРДКОДА И ИМЁН
  if (typeof fxNode.start === 'function' && fxNode.state !== 'started') {
    try {
      fxNode.start();
    } catch (e) {}
  }

  // Ищем текущий параметр в паспорте SOUND_PARAMS по совпадению nodeKey и targetParam
  const paramConfig = Object.values(SOUND_PARAMS).find(
    (p) =>
      p.nodeKey === fxNode.name ||
      (fxNode.label && p.nodeKey === fxNode.label) ||
      p.targetParam === targetParam,
  );

  let finalValue = value;

  // Если в паспорте указано, что параметр текстовый — преобразуем прилетевший числовой индекс в сочную строку
  if (paramConfig?.isTextParam && paramConfig.dictionaryKey) {
    const dict = TEXT_PARAM_DICTIONARIES[paramConfig.dictionaryKey];
    if (dict && dict.audioValues[value] !== undefined) {
      finalValue = dict.audioValues[value];

      if (typeof fxNode.set === 'function') {
        fxNode.set({ [targetParam]: finalValue });
      } else {
        fxNode[targetParam] = finalValue;
      }
      return;
    }
  }

  const paramNode = fxNode[targetParam];
  if (paramNode === undefined) return;

  // КРИТИЧЕСКИЙ ФИКС: Защита от RangeError при суженном диапазоне [0, 0] в байпасе
  if (paramNode && typeof paramNode.rampTo === 'function') {
    // Если нода аппаратно усыплена или заблокирована, пишем напрямую в свойство в обход интерполятора rampTo
    if (paramNode.maxValue === 0 || fxNode.bypassed) {
      try {
        paramNode.value = finalValue;
      } catch (e) {}
      return;
    }

    try {
      paramNode.rampTo(finalValue, 0.05);
    } catch (e) {
      try {
        paramNode.value = finalValue;
      } catch (innerError) {}
    }
    return;
  }

  fxNode[targetParam] = finalValue;
};

export const logBypassTransition = (
  label,
  synthName,
  shouldBypass,
  isCurrentlyBypassed,
) => {
  if (shouldBypass && !isCurrentlyBypassed) {
    console.log(
      `[⚡ BYPASS ON]: Эффект "${label}" для ${synthName} усыплен. ЦП отдыхает.`,
    );
  } else if (!shouldBypass && isCurrentlyBypassed) {
    console.log(
      `[🔊 BYPASS OFF]: Эффект "${label}" для ${synthName} проснулся.`,
    );
  }
};

export const toggleNodeBypass = (fxNode, shouldBypass, label, synthName) => {
  logBypassTransition(label, synthName, shouldBypass, fxNode.bypassed);
  fxNode.bypassed = shouldBypass;
};

const isValidEffectNode = (fxNode, liveValue) => {
  return (
    fxNode && (typeof liveValue === 'number' || typeof liveValue === 'string')
  );
};

const applyEffectSettings = (
  fxNode,
  liveValue,
  paramConfig,
  synthName,
  allSettings,
) => {
  const deviceConfig = Object.values(EFFECT_DEVICES).find(
    (device) => device.nodeKey === paramConfig.nodeKey,
  );

  // ЧЕСТНАЯ СТРОГАЯ ПРОВЕРКА:
  const isEffectActiveByButton = deviceConfig?.activeKey
    ? allSettings[deviceConfig.activeKey] === true
    : true;

  // Если прибор выключен кнопкой (Active === false), принудительно зануляем микс wet в железе
  if (!isEffectActiveByButton && paramConfig.targetParam === 'wet') {
    updateEffectParam(fxNode, 'wet', 0);
  } else {
    updateEffectParam(fxNode, paramConfig.targetParam, liveValue);
  }

  const mainWetParamName = Object.keys(SOUND_PARAMS).find(
    (key) =>
      SOUND_PARAMS[key].nodeKey === paramConfig.nodeKey &&
      SOUND_PARAMS[key].targetParam === 'wet',
  );

  if (mainWetParamName) {
    const wetValue =
      allSettings[mainWetParamName] ??
      SOUND_PARAMS[mainWetParamName].default ??
      0;
    const wetParamConfig = SOUND_PARAMS[mainWetParamName];

    // Условие слайдера: равен ли он нулю руками
    const isSliderAtBypassValue = checkBypassCondition(
      wetValue,
      wetParamConfig.bypassValue,
    );

    // Нода уходит в байпас (0% ЦП), если кнопка выключена (OFF)
    // ИЛИ если кнопка включена (ON), но сам ползунок микса Wet равен нулю!
    const shouldBypass =
      !isEffectActiveByButton ||
      (isEffectActiveByButton && isSliderAtBypassValue);

    toggleNodeBypass(fxNode, shouldBypass, wetParamConfig.label, synthName);
  }
};

export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SOUND_PARAMS)
    .filter(([_, paramConfig]) => paramConfig.isEffect && paramConfig.nodeKey)
    .forEach(([paramName, paramConfig]) => {
      const fxNode = synthInstance[paramConfig.nodeKey];

      // БЕЗОПАСНЫЙ ПОДХВАТ ДЕФОЛТОВ ИЗ ПАСПОРТА:
      const liveValue = settings[paramName] ?? paramConfig.default ?? 0;

      if (isValidEffectNode(fxNode, liveValue)) {
        applyEffectSettings(
          fxNode,
          liveValue,
          paramConfig,
          synthName,
          settings,
        );
      }
    });
};
