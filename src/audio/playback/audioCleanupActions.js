import { resetDrumLevels, resetSynthAnalysers } from '../sync/visualizerState';

const isMissing = (target) => !target;
const isResourceDisposable = (res) =>
  res && !res.disposed && typeof res.dispose === 'function';
const hasRefCurrentStructure = (ref) => ref && ref.current !== undefined;

const extractTargetRegistry = (refOrObj) => {
  if (isMissing(refOrObj)) return null;
  return hasRefCurrentStructure(refOrObj) ? refOrObj.current : refOrObj;
};

const disposeSingleResource = (res) => {
  if (isResourceDisposable(res)) {
    res.dispose();
  }
};

const disposeRefRegistry = (registryRef) => {
  const registry = extractTargetRegistry(registryRef);
  if (isMissing(registry)) return;

  Object.values(registry).forEach(disposeSingleResource);

  if (hasRefCurrentStructure(registryRef)) {
    registryRef.current = {};
  }
};

export const cleanupAudioResources = ({
  parts,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  disposeRefRegistry(analysersRef);
  disposeRefRegistry(channelsRef);
  resetSynthAnalysers();

  if (parts) {
    Object.values(parts).forEach(disposeSingleResource);
  }
  if (drumPart) {
    disposeSingleResource(drumPart);
  }
};

export const stopAllAudio = (refs) => {
  cleanupAudioResources({
    synths: refs.synths?.current,
    parts: refs.parts?.current,
    drumEngine: refs.drumsEngine?.current,
    drumPart: refs.drumsPart?.current,
    analysersRef: refs.synthAnalysersRef,
    channelsRef: refs.synthChannelsRef,
  });

  if (refs.synths?.current) refs.synths.current = {};
  if (refs.parts?.current) refs.parts.current = {};
  if (refs.drumsEngine?.current) refs.drumsEngine.current = null;
  if (refs.drumsPart?.current) refs.drumsPart.current = null;

  resetDrumLevels();
};
