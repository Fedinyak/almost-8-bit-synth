import {
  WET_PARAM_KEY,
  BYPASS_WET_VALUE,
} from '../../constants/audioEngineConfig';
import { checkBypassCondition } from '../../utils/audioMathUtils';
import {
  SOUND_PARAMS,
  EFFECT_DEVICES,
} from '../../constants/soundParamsConfig';
import { updateEffectParam, toggleNodeBypass } from './effectModulationActions';
import { findMainWetParamName } from './effectParamRouter';

const DEFAULT_PARAM_VALUE = 0;

const isMissing = (target) => !target;
const isWetParam = (param) => param === WET_PARAM_KEY;
const shouldBypassEffect = (isActive, isSliderAtBypass) =>
  !isActive || isSliderAtBypass;

// Самодокументированный предикат, заменивший сложное условие с отрицанием
const isWetParamForcedToBypass = (isEffectActive, paramName) => {
  return !isEffectActive && isWetParam(paramName);
};

const determineDeviceActivity = (paramConfig, allSettings) => {
  const deviceConfig = Object.values(EFFECT_DEVICES).find(
    (device) => device.nodeKey === paramConfig.nodeKey,
  );

  return deviceConfig?.activeKey
    ? allSettings[deviceConfig.activeKey] === true
    : true;
};

export const applyEffectSettings = (
  fxNode,
  liveValue,
  paramConfig,
  synthName,
  allSettings,
) => {
  const isEffectActiveByButton = determineDeviceActivity(
    paramConfig,
    allSettings,
  );

  if (
    isWetParamForcedToBypass(isEffectActiveByButton, paramConfig.targetParam)
  ) {
    updateEffectParam(fxNode, WET_PARAM_KEY, BYPASS_WET_VALUE);
  } else {
    updateEffectParam(fxNode, paramConfig.targetParam, liveValue);
  }

  const mainWetParamName = findMainWetParamName(paramConfig.nodeKey);
  if (isMissing(mainWetParamName)) return;

  const wetParamConfig = SOUND_PARAMS[mainWetParamName];
  const wetValue =
    allSettings[mainWetParamName] ??
    wetParamConfig.default ??
    DEFAULT_PARAM_VALUE;

  const isSliderAtBypassValue = checkBypassCondition(
    wetValue,
    wetParamConfig.bypassValue,
  );
  const shouldBypass = shouldBypassEffect(
    isEffectActiveByButton,
    isSliderAtBypassValue,
  );

  toggleNodeBypass(fxNode, shouldBypass, wetParamConfig.label, synthName);
};
