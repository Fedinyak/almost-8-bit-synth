import createSynth from './synthEngine';
import createDrums from './drumEngine';
import { resetDrumLevels, resetSynthAnalysers } from './visualizerState';

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

export const cleanupAudioResources = ({
  synths,
  parts,
  drumEngine,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  if (synths) {
    Object.values(synths).forEach((synthContainer) => {
      if (synthContainer && typeof synthContainer.dispose === 'function') {
        synthContainer.dispose();
      }
    });
  }

  const disposeRes = (res) =>
    res && !res.disposed && typeof res.dispose === 'function' && res.dispose();

  if (analysersRef?.current)
    Object.values(analysersRef.current).forEach(disposeRes);
  if (channelsRef?.current)
    Object.values(channelsRef.current).forEach(disposeRes);

  if (analysersRef) analysersRef.current = {};
  if (channelsRef) channelsRef.current = {};
  resetSynthAnalysers();

  const audioResources = [
    ...Object.values(parts || {}),
    ...Object.values(drumEngine || {}),
    drumPart,
  ];

  audioResources.filter(Boolean).forEach(disposeRes);
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
