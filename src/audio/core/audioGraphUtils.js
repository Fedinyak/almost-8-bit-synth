// --- МАТЕМАТИЧЕСКИЕ И АРХИТЕКТУРНЫЕ КОНСТАНТЫ ЗВУКОВОГО ГРАФА ---
const MINIMUM_AUDIO_CHAIN_NODES = 2; // Минимальное количество узлов для сборки цепи
const AUDIO_CHAIN_LOOP_OFFSET = 1; // Сдвиг индекса для предотвращения выхода за границы массива

/**
 * Последовательно соединяет соседние аудио-ноды в массиве (протягивает провода)
 * @param {Array} nodes - Массив аудио-узлов
 */
const linkAdjacentNodes = (nodes) => {
  for (let i = 0; i < nodes.length - AUDIO_CHAIN_LOOP_OFFSET; i++) {
    if (typeof nodes[i].connect === 'function') {
      nodes[i].connect(nodes[i + 1]);
    }
  }
};

/**
 * Отправляет финальный узел цепочки на колонки (главный аудио-выход)
 * @param {Object} lastNode - Последний аудио-узел в цепи
 */
const routeToMainOutput = (lastNode) => {
  if (lastNode && typeof lastNode.toDestination === 'function') {
    lastNode.toDestination();
  }
};

/**
 * Утилита последовательного соединения аудио-узлов (нативных или Tone.js)
 * @param {Array} nodes - Полный массив аудио-компонентов для сборки канала
 */
export const connectAudioChain = (nodes) => {
  // Охранное условие (Guard Clause)
  if (!Array.isArray(nodes) || nodes.length < MINIMUM_AUDIO_CHAIN_NODES) return;

  linkAdjacentNodes(nodes);
  routeToMainOutput(nodes[nodes.length - 1]);
};

export const resetEffectMix = (node) => {
  if (node && node.wet) node.set({ wet: 0 });
};

export const bypassAudioNode = (node) => {
  if (node) node.bypassed = true;
};

export const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);
  resetEffectMix(node);
  bypassAudioNode(node);
  return node;
};
