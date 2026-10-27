import { SYNTH_FACADE_ROUTING } from '../../constants/soundParamsConfig';
import {
  executeHardwareDisconnect,
  executeEnvelopeAccessorsMapping,
  resolvePresetStrategyValue,
} from './synthEngineModel';
import {
  canDisconnectFromHardware,
  shouldUpdateActiveAudioHardware,
  isCutoffParamValid,
  isNumberValue,
  isStrategyOscillator,
  isStrategyNested,
  isToneNodeConnectable,
  getOscillatorType,
} from './synthHardware';
import {
  defineReadOnlyProperty,
  defineProxyValueProperty,
  buildNestedProxyNode,
  executeCoreAccessorsInjection,
} from '../../utils/audioFacadeMetaprogramming';

// --- ДЕКЛАРАТИВНЫЕ СБОРЩИКИ ПАЙПЛАЙНА ФАСАДА ---

const buildDynamicPresetProperties = (rack, adapter) => {
  const strategies = SYNTH_FACADE_ROUTING.presetStrategies;
  const keys = Object.keys(strategies);
  const totalKeys = keys.length;

  for (let i = 0; i < totalKeys; i++) {
    const propName = keys[i];
    const strategy = strategies[propName];

    defineReadOnlyProperty(rack, propName, () =>
      resolvePresetStrategyValue(
        strategy,
        adapter.presetConfig,
        isNumberValue,
        isStrategyOscillator,
        isStrategyNested,
        getOscillatorType,
      ),
    );
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
  const totalCompositeKeys = compositeMap.length;

  for (let i = 0; i < totalCompositeKeys; i++) {
    const objectName = compositeKeys[i];
    const structureDefinition = compositeMap[objectName];

    defineReadOnlyProperty(rack, objectName, () =>
      buildNestedProxyNode(rack, structureDefinition),
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

  executeCoreAccessorsInjection(
    rack,
    adapter,
    SYNTH_FACADE_ROUTING.coreAccessors,
  );
  executeEnvelopeAccessorsMapping(
    rack,
    state,
    adapter,
    SYNTH_FACADE_ROUTING.envelopeAccessors,
  );

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
