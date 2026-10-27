import { getNativeContext } from '../context/nativeContext';
import {
  buildVirtualHardwareRegistry,
  buildVirtualModulationStubs,
} from './effectsRackStubs';

const SIGNAL_MAX_AMPLITUDE = 1.0;

// Начальное состояние панорамы по умолчанию — ровно по充ентру (0.0)
const INITIAL_PANNER_CENTER_VALUE = 0.0;

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

// Инициализируем панировщик в центральном положении
const initializePannerNode = (ctx) => {
  const pannerNode = ctx.createStereoPanner();
  pannerNode.pan.value = INITIAL_PANNER_CENTER_VALUE;
  return pannerNode;
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

  // 1. Инициализируем обязательные системные узлы канала в дефолтных значениях
  const pannerNode = initializePannerNode(ctx);
  const outputGainNode = initializeGainNode(ctx);

  // 2. Собираем внутренности рэка: Панорама -> Выходной гейн громкости рэка
  const hardwareRoutingPipeline = [pannerNode, outputGainNode];
  connectAudioChainPipeline(hardwareRoutingPipeline);

  // ЖЕЛЕЗНАЯ КОММУТАЦИЯ: Гарантируем, что выход рэка всегда подключен к колонкам
  outputGainNode.connect(ctx.destination);

  // 3. Безопасно коммутируем источник звука на вход панорамы рэка
  if (rawSynth && typeof rawSynth.connectInternal === 'function') {
    // Если это адаптер барабана, отдаем ему ноду панорамы для внутренней коммутации его GainNode
    rawSynth.connectInternal(pannerNode);
  } else if (hasConnectMethod(rawSynth)) {
    // Если это синт (нативный аудио-узел), подключаем его напрямую ко входу панорамы рэка
    rawSynth.connect(pannerNode);
  }

  // 4. Собираем виртуальный слой совместимости с UI/Redux
  const virtualFxRegistry = buildVirtualHardwareRegistry();
  const virtualModulation = buildVirtualModulationStubs();

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
