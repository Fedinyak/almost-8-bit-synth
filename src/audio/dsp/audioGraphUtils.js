import { getNativeContext } from '../context/nativeContext';

// --- КОНСТАНТЫ ЗВУКОВОГО ГРАФА И АВТОМАТИЗАЦИИ ---
const MINIMUM_AUDIO_CHAIN_NODES = 2;
const AUDIO_CHAIN_LOOP_OFFSET = 1;
const DEFAULT_RAMP_DURATION_SEC = 0.05;
const RESET_WET_MIX_VALUE = 0;

// --- САМОДОКУМЕНТИРОВАННЫЕ ПРЕДИКАТЫ (FP ПРЕДИКТЫ) ---
const isNodeMissing = (node) => !node;
const isNativeAudioParam = (param) => param !== null;
const hasPropertyValueChanged = (paramNode, targetValue) =>
  paramNode.value !== targetValue;

/**
 * Чистая функция извлечения низкоуровневого AudioParam из полиморфных узлов графа
 */
const extractNativeAudioParam = (paramNode) => {
  if (isNodeMissing(paramNode)) return null;

  const candidate = paramNode._param || paramNode.input || paramNode;

  return candidate && typeof candidate.setValueAtTime === 'function'
    ? candidate
    : null;
};

/**
 * Абстракция над "поездом" методов Web Audio API для плавного изменения параметров
 */
const scheduleLinearRamp = (nativeParam, targetValue, now, duration) => {
  nativeParam.cancelScheduledValues(now);
  nativeParam.setValueAtTime(nativeParam.value, now);
  nativeParam.linearRampToValueAtTime(targetValue, now + duration);
};

/**
 * Изолированная утилита безопасной записи значений в полиморфные примитивы
 * Декларативно скрывает каскадные try/catch блоки для снижения когнитивной нагрузки
 */
const safelyMutatePrimitiveValue = (paramNode, targetValue) => {
  try {
    if (hasPropertyValueChanged(paramNode, targetValue)) {
      paramNode.value = targetValue;
    }
  } catch (error) {
    try {
      paramNode.value = targetValue;
    } catch (fallbackError) {
      // Фоллоубек на случай, если узел является чистым примитивом, переданным по ссылке
      paramNode = targetValue;
    }
  }
};

/**
 * Последовательно соединяет соседние аудио-ноды в массиве (протягивает провода)
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
 */
const routeToMainOutput = (lastNode) => {
  if (lastNode && typeof lastNode.toDestination === 'function') {
    lastNode.toDestination();
  }
};

/**
 * Утилита последовательного соединения аудио-узлов (нативных или Tone.js)
 */
export const connectAudioChain = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length < MINIMUM_AUDIO_CHAIN_NODES) return;

  linkAdjacentNodes(nodes);
  routeToMainOutput(nodes[nodes.length - 1]);
};

/**
 * Декларативный сброс уровня подмешивания эффекта в ноль
 */
export const resetEffectMix = (node) => {
  if (node && typeof node.set === 'function') {
    node.set({ wet: RESET_WET_MIX_VALUE });
  } else if (node && node.wet !== undefined) {
    node.wet = RESET_WET_MIX_VALUE;
  }
};

/**
 * Переводит аудио-узел в режим аппаратного обхода (Bypass)
 */
export const bypassAudioNode = (node) => {
  if (node) {
    node.bypassed = true;
  }
};

/**
 * Фабрика создания спящих эффектов с нулевым начальным миксом
 */
export const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);
  resetEffectMix(node);
  bypassAudioNode(node);
  return node;
};

/**
 * Декларативная утилита для плавного изменения любого AudioParam (Замена .rampTo)
 * Избавлена от смешения абстракций и каскадных try/catch за счет слоев FP
 */
export const nativeRampTo = (
  paramNode,
  targetValue,
  duration = DEFAULT_RAMP_DURATION_SEC,
) => {
  if (isNodeMissing(paramNode)) return;

  const nativeParam = extractNativeAudioParam(paramNode);
  const now = getNativeContext().currentTime;

  if (isNativeAudioParam(nativeParam)) {
    scheduleLinearRamp(nativeParam, targetValue, now, duration);
    return;
  }

  safelyMutatePrimitiveValue(paramNode, targetValue);
};
