import { checkBypassCondition } from '../../utils/audioMathUtils';
import {
  SOUND_PARAMS,
  EFFECT_DEVICES,
  TEXT_PARAM_DICTIONARIES,
} from '../../constants/soundParamsConfig';
import { updateEffectParam, toggleNodeBypass } from './effectModulationActions';

const WET_PARAM_KEY = 'wet';
const BYPASS_WET_VALUE = 0;

export const findParamConfig = (fxNode, targetParam) =>
  Object.values(SOUND_PARAMS).find(
    (config) =>
      config.nodeKey === fxNode.name ||
      (fxNode.label && config.nodeKey === fxNode.label) ||
      config.targetParam === targetParam,
  );

export const getDictionaryAudioValue = (config, textValue) => {
  const dict = TEXT_PARAM_DICTIONARIES[config.dictionaryKey];
  return dict ? dict.audioValues[textValue] : undefined;
};

export const applyEffectSettings = (
  fxNode,
  liveValue,
  paramConfig,
  synthName,
  allSettings,
) => {
  const DEFAULT_PARAM_VALUE = 0;
  const isWetParam = (param) => param === WET_PARAM_KEY;
  const shouldBypassEffect = (isActive, isSliderAtBypass) =>
    !isActive || isSliderAtBypass;

  const deviceConfig = Object.values(EFFECT_DEVICES).find(
    (device) => device.nodeKey === paramConfig.nodeKey,
  );

  const isEffectActiveByButton = deviceConfig?.activeKey
    ? allSettings[deviceConfig.activeKey] === true
    : true;

  if (!isEffectActiveByButton && isWetParam(paramConfig.targetParam)) {
    updateEffectParam(fxNode, WET_PARAM_KEY, BYPASS_WET_VALUE);
  } else {
    updateEffectParam(fxNode, paramConfig.targetParam, liveValue);
  }

  const mainWetParamName = Object.keys(SOUND_PARAMS).find(
    (key) =>
      SOUND_PARAMS[key].nodeKey === paramConfig.nodeKey &&
      isWetParam(SOUND_PARAMS[key].targetParam),
  );

  if (mainWetParamName) {
    const wetValue =
      allSettings[mainWetParamName] ??
      SOUND_PARAMS[mainWetParamName].default ??
      DEFAULT_PARAM_VALUE;
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
