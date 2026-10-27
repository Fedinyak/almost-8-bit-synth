import {
  SOUND_PARAMS,
  SYNTH_FACADE_ROUTING,
} from '../../constants/soundParamsConfig';
import { executeHardwareDisconnect } from './synthEngineModel';
import {
  canDisconnectFromHardware,
  isValidAdsrParam,
  shouldUpdateActiveAudioHardware,
  getOscillatorType,
  isReleaseMethod,
  isGetterMethod,
  isCutoffParamValid,
  isNumberValue,
  isStrategyOscillator,
  isStrategyNested,
  isToneNodeConnectable,
} from './synthHardware';

// --- ИНФРАСТРУКТУРНЫЕ ФАБРИКИ СВОЙСТВ (ЧИСТЫЕ СИСТЕМНЫЕ АБСТРАКЦИИ) ---

const defineReadOnlyProperty = (target, propertyName, getterFn) => {
  Object.defineProperty(target, propertyName, {
    get: getterFn,
    configurable: true,
  });
};

const defineProxyValueProperty = (
  target,
  propertyName,
  sourceObj,
  getMethod,
  setMethod,
) => {
  Object.defineProperty(target, propertyName, {
    get: () => ({
      get value() {
        return sourceObj[getMethod]();
      },
      set value(val) {
        sourceObj[setMethod](val);
      },
    }),
    configurable: true,
  });
};

// --- СЕМАНТИЧЕСКИЕ ОПЕРАЦИИ НАД ПАРАМЕТРАМИ ---

const executeSafeAudioParameterMutation = (state, field, val) => {
  if (isValidAdsrParam(val)) {
    state[field] = val;
  }
};

const buildNestedProxyNode = (rack, definitionMap) => {
  const node = {};
  const fields = Object.keys(definitionMap);
  const totalFields = fields.length;

  for (let i = 0; i < totalFields; i++) {
    const subProperty = fields[i];
    const accessors = definitionMap[subProperty];

    Object.defineProperty(node, subProperty, {
      get: () => rack[accessors.get](),
      set: (val) => {
        rack[accessors.set](val);
      },
      configurable: true,
    });
  }

  return node;
};

const resolvePresetValue = (presetConfig, strategy) => {
  const configValue = presetConfig[strategy.configKey];
  if (isNumberValue(configValue)) {
    return configValue;
  }
  return strategy.fallback;
};

const executePresetStrategyResolution = (strategy, presetConfig) => {
  if (isStrategyOscillator(strategy.type)) {
    return getOscillatorType(presetConfig);
  }

  const resolvedBaseValue = resolvePresetValue(presetConfig, strategy);

  if (isStrategyNested(strategy.type)) {
    return { octaves: resolvedBaseValue };
  }

  return resolvedBaseValue;
};

// --- ДЕКЛАРАТИВНЫЕ СБОРЩИКИ СЛОЕВ ФАСАДА ---

const buildDynamicCoreAccessors = (rack, adapter) => {
  const map = SYNTH_FACADE_ROUTING.coreAccessors;
  const keys = Object.keys(map);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const paramKey = keys[i];
    const config = map[paramKey];

    rack[config.get] = () => adapter[config.get]();
    rack[config.set] = (val) => {
      adapter[config.set](val);
    };
  }
};

const buildDynamicEnvelopeAccessors = (rack, state, adapter) => {
  const map = SYNTH_FACADE_ROUTING.envelopeAccessors;
  const keys = Object.keys(map);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const methodName = keys[i];
    const stateField = map[methodName];

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

const buildToneJsCompatibilityProxies = (rack) => {
  const simpleProxies = SYNTH_FACADE_ROUTING.toneJsProxies;
  const simpleKeys = Object.keys(simpleProxies);
  const totalSimpleKeys = simpleKeys.length;

  for (let i = 0; i < totalSimpleKeys; i++) {
    const propertyName = simpleKeys[i];
    const config = simpleProxies[propertyName];

    defineProxyValueProperty(
      rack,
      propertyName,
      rack,
      config.sourceMethod,
      config.targetMethod,
    );
  }

  const compositeMap = SYNTH_FACADE_ROUTING.compositeObjects;
  const compositeKeys = Object.keys(compositeMap);
  const totalCompositeKeys = compositeKeys.length;

  for (let i = 0; i < totalCompositeKeys; i++) {
    const objectName = compositeKeys[i];
    const structureDefinition = compositeMap[objectName];

    defineReadOnlyProperty(rack, objectName, () =>
      buildNestedProxyNode(rack, structureDefinition),
    );
  }
};

const buildDynamicPresetProperties = (rack, adapter) => {
  const strategies = SYNTH_FACADE_ROUTING.presetStrategies;
  const keys = Object.keys(strategies);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const propName = keys[i];
    const strategy = strategies[propName];

    defineReadOnlyProperty(rack, propName, () =>
      executePresetStrategyResolution(strategy, adapter.presetConfig),
    );
  }
};

// --- ПУБЛИЧНЫЙ API ИНЖЕКЦИИ ФАСАДОВ ---

/**
 * Проксирует методы управления звуком с внутреннего синтезатора на уровень рэка эффектов
 */
export const injectSynthMethodsToRackFacade = (rack, adapter, state) => {
  buildDynamicPresetProperties(rack, adapter);

  rack.releaseTime = state.releaseTime;

  buildDynamicCoreAccessors(rack, adapter);
  buildDynamicEnvelopeAccessors(rack, state, adapter);

  rack.getCutoff = () => state.filterCutoffValue;
  rack.setCutoff = (val) => {
    if (isCutoffParamValid(val)) {
      state.filterCutoffValue = val;
      if (shouldUpdateActiveAudioHardware(state)) {
        state.nativeBiquad.frequency.setValueAtTime(val, state.ctx.currentTime);
      }
    }
  };

  buildToneJsCompatibilityProxies(rack);
};

/**
 * Декларативно собирает внешние методы нативной коммутации для рэка канала
 */
export const injectRoutingMethodsToRackFacade = (rack, adapter, state) => {
  rack.connect = (toneNode) => {
    if (isToneNodeConnectable(toneNode) && rack.output) {
      rack.output.connect(toneNode);
    }
    return rack;
  };

  rack.disconnect = () => {
    if (canDisconnectFromHardware(state)) {
      executeHardwareDisconnect(state);
    }
    if (rack.output) {
      try {
        rack.output.disconnect();
      } catch (e) {}
    }
    return rack;
  };

  rack.dispose = () => {
    rack.disconnect();
    if (typeof adapter.dispose === 'function') {
      adapter.dispose();
    }
  };
};
