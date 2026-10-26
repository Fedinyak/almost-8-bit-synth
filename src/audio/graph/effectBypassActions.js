import { SOUND_PARAMS } from '../../constants/soundParamsConfig';
import { applyEffectSettings } from './effectParamRouter';

const DEFAULT_PARAM_VALUE = 0;

// Статический кэш конфигураций: фильтруем один раз при сборке модуля, разгружая аудио-поток
const EFFECT_PARAMS_LIST = Object.entries(SOUND_PARAMS).filter(
  ([_, paramConfig]) => paramConfig.isEffect && paramConfig.nodeKey,
);

const isPropertyDifferent = (current, target) => current !== target;
const isValidEffectNode = (fxNode, liveValue) =>
  fxNode && (typeof liveValue === 'number' || typeof liveValue === 'string');

/**
 * Безопасно обновляет примитивное свойство аудио-узла при его изменении
 */
const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

/**
 * Логирует изменение состояния аппаратного обхода (Bypass)
 */
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

/**
 * Переключает состояние байпаса на аудио-узле эффекта
 */
export const toggleNodeBypass = (fxNode, shouldBypass, label, synthName) => {
  logBypassTransition(label, synthName, shouldBypass, fxNode.bypassed);
  updateNodeProperty(fxNode, 'bypassed', shouldBypass);
};

/**
 * Высокопроизводительный конвейер применения динамического байпаса
 * Использует кэшированный массив и быстрый нативный цикл без выделения лишней памяти
 */
export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  for (const [paramName, paramConfig] of EFFECT_PARAMS_LIST) {
    const fxNode = synthInstance[paramConfig.nodeKey];
    const liveValue =
      settings[paramName] ?? paramConfig.default ?? DEFAULT_PARAM_VALUE;

    if (isValidEffectNode(fxNode, liveValue)) {
      applyEffectSettings(fxNode, liveValue, paramConfig, synthName, settings);
    }
  }
};
