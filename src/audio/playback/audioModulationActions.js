import { synthAnalysers } from '../sync/visualizerState';
import { AUDIO_DEFAULT_VOLUME } from '../../constants/audioEngineConfig';
import { buildAndConnectInstrumentChannel } from './audioLifecycleActions';
import { connectSynthToMixer } from './audioPlaybackActions';
import {
  createAudioChannel,
  createAudioAnalyser,
} from '../core/nativeChannels';
import { nativeRampTo } from '../core/audioGraphUtils';

// Реэкспорт декомпозированных модулей, чтобы не сломать внешние импорты в хуках и слайсах
export {
  updateInstrumentEnvelope,
  applySynthEnvelope,
} from './synthEnvelopeActions';
export {
  updateEffectParam,
  logBypassTransition,
  toggleNodeBypass,
  applyDynamicBypass,
} from './effectModulationActions';

const RAMP_DURATION_SEC = 0.05;
const isMissing = (target) => !target;

export const initializeAudioRouting = (
  synthList,
  enginesRef,
  channelsRef,
  analysersRef,
) => {
  synthList.forEach((name) => {
    const synthInstance = enginesRef.current[name];
    if (isMissing(synthInstance) || analysersRef.current[name]) return;

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

export const updateInstrumentVolume = (instrument, volumeValue) => {
  if (isMissing(instrument)) return;
  const targetVolume = volumeValue ?? AUDIO_DEFAULT_VOLUME;

  if (typeof instrument.setVolume === 'function') {
    instrument.setVolume(targetVolume);
    return;
  }

  if (instrument.volume) {
    nativeRampTo(instrument.volume, targetVolume, RAMP_DURATION_SEC);
  }
};
