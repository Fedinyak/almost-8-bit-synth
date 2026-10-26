import { synthAnalysers } from '../timeline/sync/visualizerState';
import { createAudioChannel, createAudioAnalyser } from './nativeChannels';
import { connectSynthToMixer } from '../bridge/audioPlaybackActions';

const isMissing = (target) => !target;
const hasRefStructure = (ref) => ref && ref.current !== undefined;
const isRoutingAlreadySetup = (synthInstance, currentAnalyser) =>
  isMissing(synthInstance) || !isMissing(currentAnalyser);

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
  synthInstance,
  instrumentName,
  channelsRegistry,
  analysersRegistry,
) => {
  const channel = createAudioChannel();
  const analyser = createAudioAnalyser();

  connectSynthToMixer(synthInstance, channel, analyser);

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
) => {
  const engines = extractTargetRegistry(enginesRef);
  const analysers = extractTargetRegistry(analysersRef);

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
};
