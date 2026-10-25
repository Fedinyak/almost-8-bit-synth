import { checkBypassCondition } from '../../utils/audioMathUtils';
import {
  SOUND_PARAMS,
  EFFECT_DEVICES,
  TEXT_PARAM_DICTIONARIES,
} from '../../constants/soundParamsConfig';
import { nativeRampTo } from '../core/audioGraphUtils';

const WET_PARAM_KEY = 'wet';
const RAMP_DURATION_SEC = 0.05;
const BYPASS_WET_VALUE = 0;

const isMissing = (target) => !target;
const isTextParamConfig = (config) =>
  config?.isTextParam && config.dictionaryKey;
const shouldBypassEffect = (isActive, isSliderAtBypass) =>
  !isActive || isSliderAtBypass;
const isPropertyDifferent = (current, target) => current !== target;

const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

export const updateEffectParam = (fxNode, targetParam, value) => {
  if (isMissing(fxNode) || !targetParam) return;

  if (targetParam === WET_PARAM_KEY) {
    if (typeof fxNode.set === 'function') {
      fxNode.set({ wet: value });
    } else {
      updateNodeProperty(fxNode, WET_PARAM_KEY, value);
    }
    return;
  }

  if (typeof fxNode.start === 'function' && fxNode.state !== 'started') {
    try {
      fxNode.start();
    } catch (e) {}
  }

  const paramConfig = Object.values(SOUND_PARAMS).find(
    (p) =>
      p.nodeKey === fxNode.name ||
      (fxNode.label && p.nodeKey === fxNode.label) ||
      p.targetParam === targetParam,
  );

  let finalValue = value;

  if (isTextParamConfig(paramConfig)) {
    const dict = TEXT_PARAM_DICTIONARIES[paramConfig.dictionaryKey];
    if (dict && dict.audioValues[value] !== undefined) {
      finalValue = dict.audioValues[value];
      if (typeof fxNode.set === 'function') {
        fxNode.set({ [targetParam]: finalValue });
      } else {
        updateNodeProperty(fxNode, targetParam, finalValue);
      }
      return;
    }
  }

  const paramNode = fxNode[targetParam];
  if (paramNode === undefined) return;

  if (
    paramNode &&
    (paramNode._param ||
      paramNode.input ||
      typeof paramNode.cancelScheduledValues === 'function')
  ) {
    if (paramNode.maxValue === 0 || fxNode.bypassed) {
      updateNodeProperty(paramNode, 'value', finalValue);
      return;
    }
    nativeRampTo(paramNode, finalValue, RAMP_DURATION_SEC);
    return;
  }

  updateNodeProperty(fxNode, targetParam, finalValue);
};

export const logBypassTransition = (
  label,
  synthName,
  shouldBypass,
  isCurrentlyBypassed,
) => {
  if (shouldBypass && !isCurrentlyBypassed) {
    console.log(
      `[⚡ BYPASS ON]: Эффект "${label}" для ${synthName} усыплен. ЦП отдыхает.,`,
    );
  } else if (!shouldBypass && isCurrentlyBypassed) {
    console.log(
      `[🔊 BYPASS OFF]: Эффект "${label}" для ${synthName} проснулся.,`,
    );
  }
};

export const toggleNodeBypass = (fxNode, shouldBypass, label, synthName) => {
  logBypassTransition(label, synthName, shouldBypass, fxNode.bypassed);
  updateNodeProperty(fxNode, 'bypassed', shouldBypass);
};

const isValidEffectNode = (fxNode, liveValue) => {
  return (
    fxNode && (typeof liveValue === 'number' || typeof liveValue === 'string')
  );
};

const applyEffectSettings = (
  fxNode,
  liveValue,
  paramConfig,
  synthName,
  allSettings,
) => {
  const deviceConfig = Object.values(EFFECT_DEVICES).find(
    (device) => device.nodeKey === paramConfig.nodeKey,
  );

  const isEffectActiveByButton = deviceConfig?.activeKey
    ? allSettings[deviceConfig.activeKey] === true
    : true;

  if (!isEffectActiveByButton && paramConfig.targetParam === WET_PARAM_KEY) {
    updateEffectParam(fxNode, WET_PARAM_KEY, BYPASS_WET_VALUE);
  } else {
    updateEffectParam(fxNode, paramConfig.targetParam, liveValue);
  }

  const mainWetParamName = Object.keys(SOUND_PARAMS).find(
    (key) =>
      SOUND_PARAMS[key].nodeKey === paramConfig.nodeKey &&
      SOUND_PARAMS[key].targetParam === WET_PARAM_KEY,
  );

  if (mainWetParamName) {
    const wetValue =
      allSettings[mainWetParamName] ??
      SOUND_PARAMS[mainWetParamName].default ??
      0;
    const wetParamConfig = SOUND_PARAMS[mainWetParamName];
    const isSliderAtBypassValue = checkBypassCondition(
      wetValue,
      wetParamConfig.bypassValue,
    );

    const shouldBypass = shouldBypassEffect(
      isEffectActiveByButton,
      isSliderAtBypassValue,
    );
    toggleNodeBypass(fxNode, shouldBypass, wetParamConfig.label, synthName);
  }
};

export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SOUND_PARAMS)
    .filter(([_, paramConfig]) => paramConfig.isEffect && paramConfig.nodeKey)
    .forEach(([paramName, paramConfig]) => {
      const fxNode = synthInstance[paramConfig.nodeKey];
      const liveValue = settings[paramName] ?? paramConfig.default ?? 0;
      if (isValidEffectNode(fxNode, liveValue)) {
        applyEffectSettings(
          fxNode,
          liveValue,
          paramConfig,
          synthName,
          settings,
        );
      }
    });
};
