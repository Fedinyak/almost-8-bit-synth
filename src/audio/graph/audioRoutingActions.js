import { synthAnalysers } from '../timeline/sync/visualizerState';
import { createAudioChannel, createAudioAnalyser } from './nativeChannels';
import { connectSynthToMixer } from '../bridge/audioPlaybackActions';
import { DRUM_KIT_LIST } from '../../constants/constants';

const isMissing = (target) => !target;
const hasRefStructure = (ref) => ref && ref.current !== undefined;
const isRoutingAlreadySetup = (instance, currentAnalyser) =>
  isMissing(instance) || !isMissing(currentAnalyser);

const extractTargetRegistry = (refOrObj) => {
  if (isMissing(refOrObj)) return null;
  return hasRefStructure(refOrObj) ? refOrObj.current : refOrObj;
};

export const writeToRegistry = (registry, name, audioNode) => {
  if (registry) {
    registry[name] = audioNode;
  }
};

export const buildAndConnectInstrumentChannel = (
  instrumentInstance,
  instrumentName,
  channelsRegistry,
  analysersRegistry,
) => {
  const channel = createAudioChannel();
  const analyser = createAudioAnalyser();

  connectSynthToMixer(instrumentInstance, channel, analyser);

  writeToRegistry(
    extractTargetRegistry(channelsRegistry),
    instrumentName,
    channel,
  );
  writeToRegistry(
    extractTargetRegistry(analysersRegistry),
    instrumentName,
    analyser,
  );
  writeToRegistry(synthAnalysers, instrumentName, analyser);
};

export const initializeAudioRouting = (
  synthList,
  enginesRef,
  channelsRef,
  analysersRef,
  drumsEngineRef,
) => {
  const engines = extractTargetRegistry(enginesRef);
  const drumsEngine = extractTargetRegistry(drumsEngineRef) || engines;
  const analysers = extractTargetRegistry(analysersRef);

  // 1. Коммутируем в микшер все синтезаторы
  synthList.forEach((name) => {
    const synthInstance = engines?.[name];
    const currentAnalyser = analysers?.[name];

    if (isRoutingAlreadySetup(synthInstance, currentAnalyser)) return;

    buildAndConnectInstrumentChannel(
      synthInstance,
      name,
      channelsRef,
      analysersRef,
    );
  });

  // 2. Коммутируем в микшер все дорожки драм-машины (Симметричный профессиональный роутинг)
  DRUM_KIT_LIST.forEach((name) => {
    const drumInstance = drumsEngine?.[name];
    const currentAnalyser = analysers?.[name];

    if (isRoutingAlreadySetup(drumInstance, currentAnalyser)) return;

    buildAndConnectInstrumentChannel(
      drumInstance,
      name,
      channelsRef,
      analysersRef,
    );
  });
};
