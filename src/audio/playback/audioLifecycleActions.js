import createSynth from '../engines/synthEngine';
import createDrums from '../engines/drumEngine';
import { resetDrumLevels, resetSynthAnalysers } from '../sync/visualizerState';

const disposeSingleResource = (res) => {
  if (res && !res.disposed && typeof res.dispose === 'function') {
    // ВРЕМЕННЫЙ ДЕТЕКТОР ОЧИСТКИ:
    // const nodeName = res.constructor.name || 'AudioNode';
    // console.log(
    //   `[DISPOSE DETECTED]: Узел "${nodeName}" успешно удален из памяти.`,
    // );

    res.dispose();
  }
};

const disposeCustomContainers = (synths) => {
  if (!synths) return;
  Object.values(synths).forEach((container) =>
    disposeSingleResource(container),
  );
};

const disposeRefRegistry = (registryRef) => {
  if (!registryRef?.current) return;

  Object.values(registryRef.current).forEach((resource) =>
    disposeSingleResource(resource),
  );
  registryRef.current = {};
};

const disposeNativeResources = (parts, drumEngine, drumPart) => {
  const audioResources = [
    ...Object.values(parts || {}),
    ...Object.values(drumEngine || {}),
    drumPart,
  ];

  audioResources
    .filter(Boolean)
    .forEach((resource) => disposeSingleResource(resource));
};

export const cleanupAudioResources = ({
  synths,
  parts,
  drumEngine,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  disposeCustomContainers(synths);

  disposeRefRegistry(analysersRef);
  disposeRefRegistry(channelsRef);
  resetSynthAnalysers();

  disposeNativeResources(parts, drumEngine, drumPart);
};

export const initializeSynths = (synthList, enginesRef) => {
  synthList.forEach((synthName) => {
    if (!enginesRef[synthName]) {
      enginesRef[synthName] = createSynth();
    }
  });
};

export const initializeDrums = (drumsRef) => {
  if (!drumsRef.current) {
    drumsRef.current = createDrums();
  }
};

export const stopAllAudio = (refs) => {
  cleanupAudioResources({
    synths: refs.synths.current,
    parts: refs.parts.current,
    drumEngine: refs.drumsEngine.current,
    drumPart: refs.drumsPart.current,
    analysersRef: refs.synthAnalysersRef,
    channelsRef: refs.synthChannelsRef,
  });

  refs.synths.current = {};
  refs.parts.current = {};
  refs.drumsEngine.current = null;
  refs.drumsPart.current = null;

  resetDrumLevels();
};

export const buildAndConnectInstrumentChannel = (
  synthInstance,
  instrumentName,
  channelsRegistry,
  analysersRegistry,
  globalVisualizerState,
  createChannel,
  createAnalyser,
  connectToMixer,
) => {
  const channel = createChannel();
  const analyser = createAnalyser();

  connectToMixer(synthInstance, channel, analyser);

  channelsRegistry[instrumentName] = channel;
  analysersRegistry[instrumentName] = analyser;
  globalVisualizerState[instrumentName] = analyser;
};
