import { SYNTH_PARAM_STATE_MAP } from '../../constants/soundParamsConfig';
import {
  dbToLinearGain,
  isNodeMissing,
  FILTER_TYPE_LOWPASS,
  isGetterMethod,
  isReleaseMethod,
  executeSafeAudioParameterMutation,
  isNumberValue,
} from './synthHardware';

// --- ФУНКЦИОНАЛЬНЫЕ СБОРЩИКИ ПАРАМЕТРОВ ---

const reduceConfigParameters = (presetConfig, defaults, mapDefinition) => {
  const result = {};
  const keys = Object.keys(mapDefinition);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const configKey = keys[i];
    const mapping = mapDefinition[configKey];
    const configValue = presetConfig[configKey];

    const hasValidFallbackKey = typeof mapping.defaultKey === 'string';
    const fallbackValue = hasValidFallbackKey
      ? defaults[mapping.defaultKey]
      : mapping.defaultFallback;

    result[mapping.stateKey] = isNumberValue(configValue)
      ? configValue
      : fallbackValue;
  }

  return result;
};

// --- СИСТЕМНЫЕ МЕТОДЫ ЖИЗНЕННОГО ЦИКЛА И КОММУТАЦИИ ---

export const hasDisposeMethod = (container) =>
  container && typeof container.dispose === 'function';

export const updateHardwareSynthVolume = (
  { outputNode, ctx },
  decibelsValue,
) => {
  if (outputNode && ctx) {
    outputNode.gain.setValueAtTime(
      dbToLinearGain(decibelsValue),
      ctx.currentTime,
    );
  }
};

export const updateHardwareFilterQ = (state, value) => {
  if (state.nativeBiquad && state.ctx) {
    state.nativeBiquad.Q.setValueAtTime(value, state.ctx.currentTime);
  }
};

export const executeHardwareDisconnect = (state) => {
  if (state.outputNode && state.isConnectedToHardware) {
    try {
      state.outputNode.disconnect();
      state.isConnectedToHardware = false;
    } catch (e) {}
  }
};

export const executeFilterDisconnect = ({ nativeBiquad }) => {
  if (isNodeMissing(nativeBiquad)) return;
  try {
    nativeBiquad.disconnect();
  } catch (e) {}
};

export const createInitialSynthState = (presetConfig, defaults) => {
  // Унифицированно собираем все физические параметры и ADSR в один проход
  const coreAndEnvelopeParams = reduceConfigParameters(
    presetConfig,
    defaults,
    SYNTH_PARAM_STATE_MAP,
  );

  return {
    ...coreAndEnvelopeParams,
    isInitialized: false,
    isConnectedToHardware: false,
    ctx: null,
    outputNode: null,
    nativeBiquad: null,
  };
};

export const assembleNativeSynthGraph = (state, pannerNode) => {
  const outputNode = state.ctx.createGain();
  outputNode.gain.value = dbToLinearGain(state.volumeValue);

  const nativeBiquad = state.ctx.createBiquadFilter();
  nativeBiquad.type = FILTER_TYPE_LOWPASS;
  nativeBiquad.frequency.value = state.filterCutoffValue;
  nativeBiquad.Q.value = state.filterQValue;

  nativeBiquad.connect(outputNode);
  outputNode.connect(pannerNode);

  return { outputNode, nativeBiquad };
};

// --- ВЫНЕСЕННАЯ БИЗНЕС-ЛОГИКА СТРАТЕГИЙ ПРЕСЕТОВ И ФАСАДОВ ---

export const executeEnvelopeAccessorsMapping = (
  rack,
  state,
  adapter,
  routingConfig,
) => {
  const keys = Object.keys(routingConfig);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const methodName = keys[i];
    const stateField = routingConfig[methodName];

    if (isGetterMethod(methodName)) {
      rack[methodName] = () => state[stateField];
    } else {
      rack[methodName] = (val) => {
        executeSafeAudioParameterMutation(state, stateField, val);
        if (isReleaseMethod(methodName)) {
          adapter.releaseTime = val;
        }
      };
    }
  }
};

export const resolvePresetStrategyValue = (
  strategy,
  presetConfig,
  isNumberFn,
  isOscillatorFn,
  isNestedFn,
  getOscTypeFn,
) => {
  if (isOscillatorFn(strategy.type)) {
    return getOscTypeFn(presetConfig);
  }

  const configValue = presetConfig[strategy.configKey];
  const resolvedBaseValue = isNumberFn(configValue)
    ? configValue
    : strategy.fallback;

  if (isNestedFn(strategy.type)) {
    return { octaves: resolvedBaseValue };
  }

  return resolvedBaseValue;
};
