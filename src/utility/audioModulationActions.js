import * as Tone from 'tone';
import { checkBypassCondition } from './audioMathUtils';
import { synthAnalysers } from './visualizerState';
import { SOUND_PARAMS, EFFECT_DEVICES } from '../constants/soundParamsConfig';
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
    instrument.volume.value = volumeValue ?? AUDIO_DEFAULT_VOLUME;
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

  // Если это СИНТ (MonoSynth) — крутим параметры его ВНУТРЕННЕГО фильтра
  if (settings.filterQ !== undefined && instrument.filter) {
    instrument.filter.Q.value = settings.filterQ;
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

  // Если это БАРАБАН — у него есть ВНЕШНИЙ фильтр fxFilter в контейнере эффектов!
  if (synthInstance.fxFilter) {
    if (settings.filterCutoff !== undefined) {
      synthInstance.fxFilter.frequency.value = settings.filterCutoff;
    }
    if (settings.filterQ !== undefined) {
      synthInstance.fxFilter.Q.value = settings.filterQ;
    }
  }

  updateInstrumentVolume(nativeInstrument, settings.volume);
  updateInstrumentEnvelope(nativeInstrument, settings);
};

export const updateEffectParam = (fxNode, targetParam, value) => {
  if (!fxNode || !targetParam) return;

  if (targetParam === 'wet') {
    fxNode.set({ wet: value });
  } else if (targetParam === 'frequency' && fxNode.frequency) {
    fxNode.frequency.value = value;
  } else if (targetParam === 'Q' && fxNode.Q) {
    fxNode.Q.value = value;
  } else if (targetParam === 'bits') {
    fxNode.bits = value;
  } else if (targetParam === 'distortion') {
    fxNode.distortion = value;
  } else if (targetParam === 'feedback' && fxNode.feedback) {
    fxNode.feedback.value = value;
  }
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
  return fxNode && typeof liveValue === 'number';
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

  // 🆕 ЧЕСТНАЯ СТРОГАЯ ПРОВЕРКА:
  // Эффект в Tone.js включается ТОЛЬКО тогда, когда флаг активности в Редаксе равен явной true.
  // Если там false или undefined — прибор спит. Это убирает фантомный запуск эффектов на старте.
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

      // 🆕 БЕЗОПАСНЫЙ ПОДХВАТ ДЕФОЛТОВ ИЗ ПАСПОРТА:
      // Если в стейте Редакса ползунка еще нет (undefined на чистых пресетах),
      // мы берем его сочное дефолтное число прямо из SOUND_PARAMS.
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
