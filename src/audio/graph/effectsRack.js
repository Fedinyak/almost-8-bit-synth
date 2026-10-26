import { getNativeContext } from '../context/nativeContext';
import {
  buildVirtualHardwareRegistry,
  buildVirtualModulationStubs,
} from './effectsRackStubs';

const SIGNAL_MAX_AMPLITUDE = 1.0;

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---
const hasConnectMethod = (node) => node && typeof node.connect === 'function';
const hasDisconnectMethod = (node) =>
  node && typeof node.disconnect === 'function';
const hasDisposeMethod = (node) => node && typeof node.dispose === 'function';

// --- ИНФРАСТРУКТУРНЫЕ ОПЕРАЦИИ НАД УЗЛАМИ ---

const initializeGainNode = (ctx) => {
  const gainNode = ctx.createGain();
  gainNode.gain.value = SIGNAL_MAX_AMPLITUDE;
  return gainNode;
};

const establishAudioConnection = (source, target) => {
  if (hasConnectMethod(source)) {
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

// --- АВТОМАТИЧЕСКИЙ КОНВЕЙЕР КОММУТАЦИИ (HARDWARE ROUTER) ---

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
) => {
  const ctx = getNativeContext();
  if (!ctx) return null;

  // 1. Инициализируем обязательные системные узлы канала
  const pannerNode = initializeGainNode(ctx);
  const outputGainNode = initializeGainNode(ctx);

  // 2. Собираем виртуальный слой совместимости с UI/Redux
  const virtualFxRegistry = buildVirtualHardwareRegistry();
  const virtualModulation = buildVirtualModulationStubs();

  // 3. Динамически выстраиваем массив для сквозной коммутации аудиографа.
  // Так как реальных эффектов еще нет, их роль патч-кордов временно выполняют panner и output.
  // Но структура уже готова принять массив реальных FX между ними!
  const hardwareRoutingPipeline = [rawSynth, pannerNode, outputGainNode];

  // 4. Декларативно запускаем конвейер соединения узлов
  connectAudioChainPipeline(hardwareRoutingPipeline);

  // 5. Формируем финальный унифицированный паспорт аудио-канала
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
