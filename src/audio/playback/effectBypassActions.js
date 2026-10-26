import { SOUND_PARAMS } from '../../constants/soundParamsConfig';
import { applyEffectSettings } from './effectParamRouter';

const isPropertyDifferent = (current, target) => current !== target;

const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

const isValidEffectNode = (fxNode, liveValue) =>
  fxNode && (typeof liveValue === 'number' || typeof liveValue === 'string');

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

export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  const DEFAULT_PARAM_VALUE = 0;

  Object.entries(SOUND_PARAMS)
    .filter(([_, paramConfig]) => paramConfig.isEffect && paramConfig.nodeKey)
    .forEach(([paramName, paramConfig]) => {
      const fxNode = synthInstance[paramConfig.nodeKey];
      const liveValue =
        settings[paramName] ?? paramConfig.default ?? DEFAULT_PARAM_VALUE;

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
