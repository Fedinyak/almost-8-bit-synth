import { getNativeContext } from '../context/nativeContext';
import {
  buildVirtualHardwareRegistry,
  buildVirtualModulationStubs,
} from './effectsRackStubs';
import {
  ROUTING_STRATEGY_NATIVE,
  ROUTING_STRATEGY_ADAPTER,
  SIGNAL_MAX_AMPLITUDE,
  INITIAL_PANNER_CENTER_VALUE,
} from '../../constants/audioEngineConfig';

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ДЛЯ СНИЖЕНИЯ КОГНИТИВНОЙ НАГРУЗКИ ---
const isContextMissing = (ctx) => !ctx;
const isNativeNodeConnectable = (node) =>
  node && typeof node.connect === 'function';
const hasDisconnectMethod = (node) =>
  node && typeof node.disconnect === 'function';
const hasDisposeMethod = (node) => node && typeof node.dispose === 'function';
const isAdapterRoutingStrategy = (strategy) =>
  strategy === ROUTING_STRATEGY_ADAPTER;
const isNativeRoutingStrategy = (strategy) =>
  strategy === ROUTING_STRATEGY_NATIVE;

// --- ИНФРАСТРУКТУРНЫЕ ОПЕРАЦИИ НАД УЗЛАМИ ---

const initializeGainNode = (ctx) => {
  const gainNode = ctx.createGain();
  gainNode.gain.value = SIGNAL_MAX_AMPLITUDE;
  return gainNode;
};

const initializePannerNode = (ctx) => {
  const pannerNode = ctx.createStereoPanner();
  pannerNode.pan.value = INITIAL_PANNER_CENTER_VALUE;
  return pannerNode;
};

const establishAudioConnection = (source, target) => {
  if (isNativeNodeConnectable(source)) {
    source.connect(target);
  }
};

const safelyDisconnectNode = (node) => {
  if (hasDisconnectMethod(node)) {
    node.disconnect();
  }
};

const safelyDisposeNode = (node) => {
  if (hasDisposeMethod(node)) {
    node.dispose();
  }
};

/**
 * Декларативно извлекает финальную точку назначения сигнала, защищая от пустых ссылок
 */
const resolveAudioTargetDestination = (ctx, customDestination) => {
  return customDestination || ctx.destination;
};

// --- ДЕКЛАРАТИВНЫЙ КОНВЕЙЕР КОММУТАЦИИ ГРАФА ---

/**
 * Динамически соединяет последовательную цепочку аудио-узлов в единый сквозной тракт
 */
const connectAudioChainPipeline = (nodesArray) => {
  const totalNodes = nodesArray.length;

  for (let i = 0; i < totalNodes - 1; i++) {
    const currentNode = nodesArray[i];
    const nextNode = nodesArray[i + 1];

    establishAudioConnection(currentNode, nextNode);
  }
};

/**
 * Декларативно определяет внутреннюю стратегию коммутации инструмента на основе его типа
 */
const determineInstrumentRoutingStrategy = (rawSynth) => {
  if (rawSynth && typeof rawSynth.connectInternal === 'function') {
    return ROUTING_STRATEGY_ADAPTER;
  }
  if (isNativeNodeConnectable(rawSynth)) {
    return ROUTING_STRATEGY_NATIVE;
  }
  return null;
};

/**
 * Выполняет безопасное подключение источника к панораме на основе выбранной стратегии
 */
const executePipelineInputConnection = (rawSynth, pannerNode, strategy) => {
  if (isAdapterRoutingStrategy(strategy)) {
    rawSynth.connectInternal(pannerNode);
  } else if (isNativeRoutingStrategy(strategy)) {
    rawSynth.connect(pannerNode);
  }
};

// --- ГЛАВНЫЙ СЛУЖЕБНЫЙ ИНТЕРФЕЙС РЭКА ---

/**
 * Единая фабрика сборки эффектов и панорамирования для каналов инструментов.
 * Динамически строит нативный аудиограф на основе декларативной цепочки эффектов из конфига.
 */
export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
  destinationNode = null,
) => {
  const ctx = getNativeContext();
  if (isContextMissing(ctx)) return null;

  // 1. Инициализируем обязательные системные узлы канала в базовом состоянии
  const pannerNode = initializePannerNode(ctx);
  const outputGainNode = initializeGainNode(ctx);

  // 2. Соединяем внутренности рэка: Панорама -> Выходной гейн громкости рэка
  const hardwareRoutingPipeline = [pannerNode, outputGainNode];
  connectAudioChainPipeline(hardwareRoutingPipeline);

  // 3. Выводим сигнал наружу рэка в строго указанную целевую ноду (или на мейн-выход по умолчанию)
  const finalAudioTarget = resolveAudioTargetDestination(ctx, destinationNode);
  outputGainNode.connect(finalAudioTarget);

  // 4. Декларативно определяем и выполняем безопасную стратегию подключения источника звука
  const activeRoutingStrategy = determineInstrumentRoutingStrategy(rawSynth);
  executePipelineInputConnection(rawSynth, pannerNode, activeRoutingStrategy);

  // 5. Собираем виртуальный слой совместимости с UI/Redux
  const virtualFxRegistry = buildVirtualHardwareRegistry();
  const virtualModulation = buildVirtualModulationStubs();

  // 6. Формируем финальный унифицированный паспорт аудио-канала
  return {
    instrument: rawSynth,
    ...virtualFxRegistry,
    ...virtualModulation,
    panner: pannerNode,
    output: outputGainNode,

    dispose() {
      safelyDisconnectNode(pannerNode);
      safelyDisconnectNode(outputGainNode);
      safelyDisconnectNode(rawSynth);
      safelyDisposeNode(rawSynth);
    },
  };
};
