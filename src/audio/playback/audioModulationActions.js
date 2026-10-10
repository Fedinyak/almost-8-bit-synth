import * as Tone from 'tone'; // Оставляем только для Volume/Analyser, пока они не переписаны
import { checkBypassCondition } from '../../utils/audioMathUtils';
import { synthAnalysers } from '../sync/visualizerState';
import {
  SOUND_PARAMS,
  EFFECT_DEVICES,
  TEXT_PARAM_DICTIONARIES,
} from '../../constants/soundParamsConfig';
import {
  ANALYSER_TYPE,
  ANALYSER_SIZE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';
import { buildAndConnectInstrumentChannel } from './audioLifecycleActions';
import { connectSynthToMixer } from './audioPlaybackActions';
import { getNativeContext } from '../core/nativeContext';

export const createAudioChannel = () => new Tone.Volume();

export const createAudioAnalyser = () =>
  new Tone.Analyser({ type: ANALYSER_TYPE, size: ANALYSER_SIZE });

export const initializeAudioRouting = (
  synthList,
  enginesRef,
  channelsRef,
  analysersRef,
) => {
  synthList.forEach((name) => {
    const synthInstance = enginesRef.current[name];
    if (!synthInstance || analysersRef.current[name]) return;

    buildAndConnectInstrumentChannel(
      synthInstance,
      name,
      channelsRef.current,
      analysersRef.current,
      synthAnalysers,
      createAudioChannel,
      createAudioAnalyser,
      connectSynthToMixer,
    );
  });
};

// Вспомогательная утилита для НАДРОДНОГО плавного изменения любого AudioParam (Замена .rampTo)
const nativeRampTo = (paramNode, targetValue, duration = 0.05) => {
  if (!paramNode) return;
  const ctx = getNativeContext();
  const now = ctx.currentTime;

  try {
    const nativeParam = paramNode._param || paramNode.input || paramNode;

    if (nativeParam && typeof nativeParam.setValueAtTime === 'function') {
      nativeParam.cancelScheduledValues(now);
      nativeParam.setValueAtTime(nativeParam.value, now);
      nativeParam.linearRampToValueAtTime(targetValue, now + duration);
    } else {
      paramNode.value = targetValue;
    }
  } catch (e) {
    try {
      paramNode.value = targetValue;
    } catch (err) {
      paramNode = targetValue;
    }
  }
};

export const updateInstrumentVolume = (instrument, volumeValue) => {
  if (instrument?.volume) {
    const targetVolume = volumeValue ?? AUDIO_DEFAULT_VOLUME;
    nativeRampTo(instrument.volume, targetVolume, 0.05);
  }
};

const updateMetalSynthEnvelope = (instrument, attack, decay) => {
  if (typeof instrument.set === 'function') {
    instrument.set({ envelope: { attack, decay } });
  } else if (instrument.envelope) {
    instrument.envelope.attack = attack;
    instrument.envelope.decay = decay;
  }
};

const updateStandardSynthEnvelope = (
  instrument,
  attack,
  decay,
  sustain,
  release,
) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set({ attack, decay, sustain, release });
  } else if (instrument.envelope) {
    instrument.envelope.attack = attack;
    instrument.envelope.decay = decay;
    instrument.envelope.sustain = sustain;
    instrument.envelope.release = release;
  }
};

const updatePercussiveSynthEnvelope = (instrument, attack, decay, release) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set({ attack, decay, release });
  } else if (instrument.envelope) {
    instrument.envelope.attack = attack;
    instrument.envelope.decay = decay;
    instrument.envelope.release = release;
  }
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

  if (settings.detune !== undefined && instrument.detune) {
    nativeRampTo(instrument.detune, settings.detune, 0.05);
  }

  if (settings.filterQ !== undefined && instrument.filter) {
    nativeRampTo(instrument.filter.Q, settings.filterQ, 0.05);
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

  if (settings.pan !== undefined && synthInstance.panner?.pan) {
    nativeRampTo(synthInstance.panner.pan, settings.pan, 0.05);
  }

  if (synthInstance.fxFilter) {
    if (
      settings.filterCutoff !== undefined &&
      synthInstance.fxFilter.frequency
    ) {
      nativeRampTo(
        synthInstance.fxFilter.frequency,
        settings.filterCutoff,
        0.05,
      );
    }
    if (settings.filterQ !== undefined && synthInstance.fxFilter.Q) {
      nativeRampTo(synthInstance.fxFilter.Q, settings.filterQ, 0.05);
    }
  }

  updateInstrumentEnvelope(nativeInstrument, settings);
};

// ============================================================================
// ВТОРАЯ ЧАСТЬ (Управление параметрами эффектов и динамический байпас)
// ============================================================================

export const updateEffectParam = (fxNode, targetParam, value) => {
  if (!fxNode || !targetParam) return;

  if (targetParam === 'wet') {
    if (typeof fxNode.set === 'function') {
      fxNode.set({ wet: value });
    } else {
      fxNode.wet = value;
    }
    return;
  }

  if (typeof fxNode.start === 'function' && fxNode.state !== 'started') {
    try {
      fxNode.start();
    } catch (e) {}
  }

  const paramConfig = Object.values(SOUND_PARAMS).find(
    (p) =>
      p.nodeKey === fxNode.name ||
      (fxNode.label && p.nodeKey === fxNode.label) ||
      p.targetParam === targetParam,
  );

  let finalValue = value;

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

  if (
    paramNode &&
    (paramNode._param ||
      paramNode.input ||
      typeof paramNode.cancelScheduledValues === 'function')
  ) {
    if (paramNode.maxValue === 0 || fxNode.bypassed) {
      try {
        paramNode.value = finalValue;
      } catch (e) {}
      return;
    }

    // Крутим ручки параметров эффектов нативно
    nativeRampTo(paramNode, finalValue, 0.05);
    return;
  }

  try {
    fxNode[targetParam] = finalValue;
  } catch (e) {}
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

  const isEffectActiveByButton = deviceConfig?.activeKey
    ? allSettings[deviceConfig.activeKey] === true
    : true;

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

    const isSliderAtBypassValue = checkBypassCondition(
      wetValue,
      wetParamConfig.bypassValue,
    );

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
