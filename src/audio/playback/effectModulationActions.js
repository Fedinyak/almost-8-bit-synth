import {
  WET_PARAM_KEY,
  NATIVE_VALUE_KEY,
  EFFECT_STARTED_STATE,
  BYPASS_WET_VALUE,
} from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../core/audioGraphUtils';
import { findParamConfig, getDictionaryAudioValue } from './effectParamRouter';

export {
  logBypassTransition,
  toggleNodeBypass,
  applyDynamicBypass,
} from './effectBypassActions';

const isMissing = (target) => !target;
const isWetParam = (param) => param === WET_PARAM_KEY;
const isPropertyDifferent = (current, target) => current !== target;
const isTextParamConfig = (config) =>
  config?.isTextParam && config.dictionaryKey;

const isNodeStopped = (node) =>
  node &&
  typeof node.start === 'function' &&
  node.state !== EFFECT_STARTED_STATE;

const isAudioParamNode = (node) =>
  node &&
  (node._param ||
    node.input ||
    typeof node.cancelScheduledValues === 'function');

const isStaticOrBypassedParam = (node, isBypassed) =>
  node && (node.maxValue === BYPASS_WET_VALUE || isBypassed);

/**
 * Безопасно обновляет примитивное свойство аудио-узла при его изменении
 */
const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

/**
 * Принудительно запускает аудио-узел, если он находится в спящем состоянии
 */
const ensureEffectIsStarted = (fxNode) => {
  if (isNodeStopped(fxNode)) {
    try {
      fxNode.start();
    } catch (error) {}
  }
};

/**
 * Обновляет уровень подмешивания (Wet) аудио-эффекта
 */
const updateWetParameter = (fxNode, value) => {
  if (typeof fxNode.set === 'function') {
    fxNode.set({ wet: value });
    return;
  }
  updateNodeProperty(fxNode, WET_PARAM_KEY, value);
};

/**
 * Декларативно применяет отмаппленное текстовое значение к параметру узла
 */
const applyTextParamValue = (fxNode, targetParam, finalValue) => {
  if (typeof fxNode.set === 'function') {
    fxNode.set({ [targetParam]: finalValue });
    return;
  }
  updateNodeProperty(fxNode, targetParam, finalValue);
};

/**
 * Модулирует конкретный параметр аудио-эффекта (Линейный плоский диспетчер)
 */
export const updateEffectParam = (fxNode, targetParam, value) => {
  if (isMissing(fxNode) || !targetParam) return;

  if (isWetParam(targetParam)) {
    updateWetParameter(fxNode, value);
    return;
  }

  ensureEffectIsStarted(fxNode);

  const paramConfig = findParamConfig(fxNode, targetParam);
  let finalValue = value;

  if (isTextParamConfig(paramConfig)) {
    const textAudioValue = getDictionaryAudioValue(paramConfig, value);
    if (textAudioValue !== undefined) {
      applyTextParamValue(fxNode, targetParam, textAudioValue);
      return;
    }
  }

  const paramNode = fxNode[targetParam];
  if (paramNode === undefined) return;

  if (
    isAudioParamNode(paramNode) &&
    isStaticOrBypassedParam(paramNode, fxNode.bypassed)
  ) {
    updateNodeProperty(paramNode, NATIVE_VALUE_KEY, finalValue);
    return;
  }

  if (isAudioParamNode(paramNode)) {
    nativeRampTo(paramNode, finalValue);
    return;
  }

  updateNodeProperty(fxNode, targetParam, finalValue);
};
