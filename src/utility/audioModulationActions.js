import * as Tone from 'tone';
import { checkBypassCondition } from './audioMathUtils';
import { synthAnalysers } from './visualizerState';
import { SOUND_PARAMS } from '../constants/soundParamsConfig';

export const createAudioChannel = () => new Tone.Volume();

export const createAudioAnalyser = () =>
  new Tone.Analyser({ type: 'waveform', size: 32 });

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

// ИСПРАВЛЕНИЕ: Передаем весь объект настроек settings, чтобы крутить и атаку, и релиз разом!
export const applySynthEnvelope = (synthInstance, settings) => {
  if (!synthInstance.instrument || !settings) return;

  // Берем живые значения, подставляя безопасный дефолт на случай расширения паспорта
  const attack = settings.attack ?? 0.005;
  const release = settings.release ?? 0.3;

  synthInstance.instrument.set({
    envelope: {
      attack,
      release,
    },
  });
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

export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SOUND_PARAMS).forEach(([paramName, paramConfig]) => {
    if (!paramConfig.isEffect || !paramConfig.nodeKey) return;

    const fxNode = synthInstance[paramConfig.nodeKey];
    const liveValue = settings[paramName];
    if (!fxNode || typeof liveValue !== 'number') return;

    updateEffectMix(fxNode, liveValue);

    const shouldBypass = checkBypassCondition(
      liveValue,
      paramConfig.bypassValue,
    );

    toggleNodeBypass(fxNode, shouldBypass, paramConfig.label, synthName);
  });
};
