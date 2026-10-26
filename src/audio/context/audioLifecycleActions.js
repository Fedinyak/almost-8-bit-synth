import { DRUM_KIT_LIST } from '../../constants/constants';
import { audioCore } from '../context/nativeEngineRegistry';
import { writeToRegistry } from '../graph/audioRoutingActions';

// Реэкспорты для сохранения работоспособности внешних импортов приложения
export { cleanupAudioResources, stopAllAudio } from './audioCleanupActions';
export {
  initializeAudioRouting,
  buildAndConnectInstrumentChannel,
} from '../graph/audioRoutingActions';

const isMissing = (target) => !target;
const hasRefStructure = (ref) => ref && ref.current !== undefined;

const extractTargetRegistry = (refOrObj) => {
  if (isMissing(refOrObj)) return null;
  return hasRefStructure(refOrObj) ? refOrObj.current : refOrObj;
};

const bindDrumsToContainer = (drumsContainer, coreDrums) => {
  if (hasRefStructure(drumsContainer)) {
    if (!drumsContainer.current) {
      drumsContainer.current = coreDrums;
    }
    return;
  }

  DRUM_KIT_LIST.forEach((drumName) => {
    writeToRegistry(drumsContainer, drumName, coreDrums[drumName]);
  });
};

export const initializeSynths = (synthList, enginesRef) => {
  if (isMissing(enginesRef)) return;

  const target = extractTargetRegistry(enginesRef);
  const coreSynths = audioCore.synths;

  synthList.forEach((synthName) => {
    if (!target[synthName]) {
      target[synthName] = coreSynths[synthName];
    }
  });
};

export const initializeDrums = (drumsRef) => {
  if (isMissing(drumsRef)) return;
  bindDrumsToContainer(drumsRef, audioCore.drums);
};
