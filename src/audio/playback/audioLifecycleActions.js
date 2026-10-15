import { audioCore } from '../core/nativeEngineRegistry';
import { resetDrumLevels, resetSynthAnalysers } from '../sync/visualizerState';

const disposeSingleResource = (res) => {
  if (res && !res.disposed && typeof res.dispose === 'function') {
    res.dispose();
  }
};

const disposeRefRegistry = (registryRef) => {
  if (!registryRef?.current) return;

  Object.values(registryRef.current).forEach((resource) =>
    disposeSingleResource(resource),
  );
  registryRef.current = {};
};

export const cleanupAudioResources = ({
  parts,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  // Мы БОЛЬШЕ НЕ ВЫЗЫВАЕМ автоматический .dispose() на инстансах инструментов,
  // так как их память вечно и безопасно удерживается синглтоном audioCore.

  disposeRefRegistry(analysersRef);
  disposeRefRegistry(channelsRef);
  resetSynthAnalysers();

  // Дорожки воспроизведения (parts) очищаем всегда, чтобы ноты в секвенсоре не накладывались друг на друга
  if (parts) {
    Object.values(parts).forEach(disposeSingleResource);
  }
  if (drumPart) {
    disposeSingleResource(drumPart);
  }
};

// ИСПРАВЛЕНО НАВСЕГДА: Прямой мост копирования вечных ссылок синтов
export const initializeSynths = (synthList, enginesRef) => {
  if (!enginesRef) return;
  const coreSynths = audioCore.synths;

  // Всеядно определяем целевой слой записи (работает и с .current, и напрямую)
  const target =
    enginesRef.current !== undefined ? enginesRef.current : enginesRef;

  synthList.forEach((synthName) => {
    if (!target[synthName]) {
      target[synthName] = coreSynths[synthName];
    }
  });
};

// ИСПРАВЛЕНО НАВСЕГДА: Прямой мост копирования вечной ссылки барабанов
export const initializeDrums = (drumsRef) => {
  if (!drumsRef) return;
  const coreDrums = audioCore.drums;

  if (drumsRef.current !== undefined) {
    if (!drumsRef.current) {
      drumsRef.current = coreDrums;
    }
  } else {
    Object.assign(drumsRef, coreDrums);
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

  // Пусть React на своем UI-слое очищает временные локальные ссылки хука
  if (refs.synths?.current) refs.synths.current = {};
  if (refs.parts?.current) refs.parts.current = {};
  if (refs.drumsEngine?.current) refs.drumsEngine.current = null;
  if (refs.drumsPart?.current) refs.drumsPart.current = null;

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

  const channels =
    channelsRegistry?.current !== undefined
      ? channelsRegistry.current
      : channelsRegistry;
  const analysers =
    analysersRegistry?.current !== undefined
      ? analysersRegistry.current
      : analysersRegistry;

  if (channels) channels[instrumentName] = channel;
  if (analysers) analysers[instrumentName] = analyser;
  if (globalVisualizerState) globalVisualizerState[instrumentName] = analyser;
};
