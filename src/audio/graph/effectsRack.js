import { getNativeContext } from '../context/nativeContext';
import {
  buildVirtualHardwareRegistry,
  buildVirtualModulationStubs,
} from './effectsRackStubs';

const SIGNAL_MAX_AMPLITUDE = 1.0;
const INITIAL_PANNER_CENTER_VALUE = 0.0;

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---
const isContextMissing = (ctx) => !ctx;
const isNativeNodeConnectable = (node) =>
  node && typeof node.connect === 'function';
const hasDisconnectMethod = (node) =>
  node && typeof node.disconnect === 'function';
const hasDisposeMethod = (node) => node && typeof node.dispose === 'function';

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

// --- АВТОМАТИЧЕСКИЙ КОНВЕЙЕР КОММУТАЦИИ ---

/**
 * Динамически соединяет последовательную цепочку аудио-узлов в единый сквозной трат
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
 * Чистый сквозной FX-канал с гарантированным нативным выводом сигнала на мастер-шину.
 */
export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
) => {
  const ctx = getNativeContext();
  if (isContextMissing(ctx)) return null;

  // 1. Инициализируем обязательные системные узлы канала в базовом состоянии
  const pannerNode = initializePannerNode(ctx);
  const outputGainNode = initializeGainNode(ctx);

  // 2. Соединяем внутренности рэка: Панорама -> Выходной гейн громкости рэка
  const hardwareRoutingPipeline = [pannerNode, outputGainNode];
  connectAudioChainPipeline(hardwareRoutingPipeline);

  // 3. ЖЕЛЕЗНАЯ КОММУТАЦИЯ: Гарантируем, что выход рэка всегда физически подключен к колонкам.
  // Это возвращает прямой звуковой мост для драм-машины, предотвращая затухание One-shot сэмплов.
  outputGainNode.connect(ctx.destination);

  // 4. Безопасно коммутируем входящий источник звука на вход панорамы рэка
  if (rawSynth && typeof rawSynth.connectInternal === 'function') {
    rawSynth.connectInternal(pannerNode);
  } else {
    establishAudioConnection(rawSynth, pannerNode);
  }

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
      if (rawSynth && typeof rawSynth.dispose === 'function') {
        rawSynth.dispose();
      }
    },
  };
};
