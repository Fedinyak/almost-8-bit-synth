import { nativeRampTo } from '../core/audioGraphUtils';
import { findParamConfig, getDictionaryAudioValue } from './effectParamRouter';

// Реэкспорт для сохранения импортов в микшере и хуках приложения
export {
  logBypassTransition,
  toggleNodeBypass,
  applyDynamicBypass,
} from './effectBypassActions';

const WET_PARAM_KEY = 'wet';
const NATIVE_VALUE_KEY = 'value';
const EFFECT_STARTED_STATE = 'started';
const BYPASS_WET_VALUE = 0;

const isMissing = (target) => !target;
const isWetParam = (param) => param === WET_PARAM_KEY;
const isNodeStopped = (node) =>
  node &&
  typeof node.start === 'function' &&
  node.state !== EFFECT_STARTED_STATE;
const isTextParamConfig = (config) =>
  config?.isTextParam && config.dictionaryKey;
const isPropertyDifferent = (current, target) => current !== target;

const isAudioParamNode = (node) =>
  node &&
  (node._param ||
    node.input ||
    typeof node.cancelScheduledValues === 'function');

const isStaticOrBypassedParam = (node, isBypassed) =>
  node && (node.maxValue === BYPASS_WET_VALUE || isBypassed);

const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

const ensureEffectIsStarted = (fxNode) => {
  if (isNodeStopped(fxNode)) {
    try {
      fxNode.start();
    } catch (error) {}
  }
};

const updateWetParameter = (fxNode, value) => {
  if (typeof fxNode.set === 'function') {
    fxNode.set({ wet: value });
    return;
  }
  updateNodeProperty(fxNode, WET_PARAM_KEY, value);
};

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
      finalValue = textAudioValue;
      if (typeof fxNode.set === 'function') {
        fxNode.set({ [targetParam]: finalValue });
        return;
      }
      updateNodeProperty(fxNode, targetParam, finalValue);
      return;
    }
  }

  const paramNode = fxNode[targetParam];
  if (paramNode === undefined) return;

  if (isAudioParamNode(paramNode)) {
    if (isStaticOrBypassedParam(paramNode, fxNode.bypassed)) {
      updateNodeProperty(paramNode, NATIVE_VALUE_KEY, finalValue);
      return;
    }
    nativeRampTo(paramNode, finalValue);
    return;
  }

  updateNodeProperty(fxNode, targetParam, finalValue);
};
