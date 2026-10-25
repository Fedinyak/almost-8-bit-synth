import { DRUM_KIT_LIST } from '../../constants/constants';
import { audioCore } from '../core/nativeEngineRegistry';
import { synthAnalysers } from '../sync/visualizerState';
import {
  createAudioChannel,
  createAudioAnalyser,
} from '../core/nativeChannels';
import { connectSynthToMixer } from './audioPlaybackActions';

// Декларативный реэкспорт логики очистки для сохранения архитектурных контрактов приложения
export { cleanupAudioResources, stopAllAudio } from './audioCleanupActions';

// --- САМОДОКУМЕНТИРОВАННЫЕ FP ПРЕДИКАТЫ ---
const isMissing = (target) => !target;
const hasRefStructure = (ref) => ref && ref.current !== undefined;
const isRoutingAlreadySetup = (synthInstance, currentAnalyser) =>
  isMissing(synthInstance) || !isMissing(currentAnalyser);

/**
 * Извлекает чистый объект данных независимо от того, передан Ref или обычный объект
 */
const extractTargetRegistry = (refOrObj) => {
  if (isMissing(refOrObj)) return null;
  return hasRefStructure(refOrObj) ? refOrObj.current : refOrObj;
};

/**
 * Чистая утилита для записи аудио-ноды в реестр без иф-лестниц
 */
const writeToRegistry = (registry, name, audioNode) => {
  if (registry) {
    registry[name] = audioNode;
  }
};

/**
 * Декларативная привязка вечного ядра ударных к переданному контейнеру на основе констант
 * Полностью уничтожает хардкод и автоматически масштабируется при добавлении новых барабанов
 */
const bindDrumsToContainer = (drumsContainer, coreDrums) => {
  if (hasRefStructure(drumsContainer)) {
    if (!drumsContainer.current) {
      drumsContainer.current = coreDrums;
    }
    return;
  }

  // Декларативный FP-перебор константного списка вместо ручного копирования строк
  DRUM_KIT_LIST.forEach((drumName) => {
    writeToRegistry(drumsContainer, drumName, coreDrums[drumName]);
  });
};

/**
 * Инициализирует синтезаторы, копируя ссылки из глобального реестра ядра
 */
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

/**
 * Инициализирует барабанный модуль, привязывая его к вечной ссылке ядра
 */
export const initializeDrums = (drumsRef) => {
  if (isMissing(drumsRef)) return;
  bindDrumsToContainer(drumsRef, audioCore.drums);
};

/**
 * Декларативно собирает и коммутирует канальную линейку для одного инструмента
 */
export const buildAndConnectInstrumentChannel = (
  synthInstance,
  instrumentName,
  channelsRegistry,
  analysersRegistry,
) => {
  const channel = createAudioChannel();
  const analyser = createAudioAnalyser();

  connectSynthToMixer(synthInstance, channel, analyser);

  // Линейная, самодокументированная запись в реестры
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

/**
 * Инициализация и сборка маршрутов микшера при старте приложения
 */
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
