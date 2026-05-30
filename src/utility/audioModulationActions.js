import * as Tone from 'tone';
import { checkBypassCondition } from './audioMathUtils';
import { synthAnalysers } from './visualizerState';
import { SOUND_PARAMS } from '../constants/soundParamsConfig';
import {
  ANALYSER_TYPE,
  ANALYSER_SIZE,
  AUDIO_DEFAULT_VOLUME,
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
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

export const updateInstrumentEnvelope = (instrument, settings) => {
  if (instrument?.envelope) {
    instrument.envelope.set({
      attack: settings.attack ?? AUDIO_DEFAULT_ATTACK,
      decay: settings.decay ?? AUDIO_DEFAULT_DECAY,
      release: settings.release ?? AUDIO_DEFAULT_RELEASE,
    });
  }
};

export const applySynthEnvelope = (synthInstance, settings) => {
  const nativeInstrument = synthInstance?.instrument;
  if (!nativeInstrument || !settings) return;

  updateInstrumentVolume(nativeInstrument, settings.volume);
  updateInstrumentEnvelope(nativeInstrument, settings);
};

export const updateEffectMix = (fxNode, value) => {
  fxNode.set({ wet: value });
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

const applyEffectSettings = (fxNode, liveValue, paramConfig, synthName) => {
  updateEffectMix(fxNode, liveValue);

  const shouldBypass = checkBypassCondition(liveValue, paramConfig.bypassValue);
  toggleNodeBypass(fxNode, shouldBypass, paramConfig.label, synthName);
};

export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SOUND_PARAMS)
    .filter(([_, paramConfig]) => paramConfig.isEffect && paramConfig.nodeKey)
    .forEach(([paramName, paramConfig]) => {
      const fxNode = synthInstance[paramConfig.nodeKey];
      const liveValue = settings[paramName];

      if (isValidEffectNode(fxNode, liveValue)) {
        applyEffectSettings(fxNode, liveValue, paramConfig, synthName);
      }
    });
};
