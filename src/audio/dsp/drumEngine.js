import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../graph/effectsRack';
import { hasDisposeMethod } from './drumEngineModel';
import {
  injectSynthMethodsToRackFacade,
  injectRoutingMethodsToRackFacade,
} from './drumEngineFacade';
import { createNativeDrumAdapter } from './drumSynthCore';

// --- АВТОМАТИЧЕСКИЙ КОНВЕЙЕР СБОРКИ CHANNEL STRIP ---

const assembleSingleRackInstrument = (drumName, typeString) => {
  const presetConfig = DRUM_PRESETS[drumName] || {};

  // 1. Декларативно запрашиваем изолированное ядро синтеза и его стейт
  const { adapter, state } = createNativeDrumAdapter(
    drumName,
    typeString,
    presetConfig,
  );

  // 2. Оборачиваем во внешний рэк нативных эффектов
  const rack = wrapInstrumentWithEffects(
    adapter,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );

  // 3. Коммутируем выход синтезатора со входом рэка (pannerNode)
  adapter.connectInternal(rack.panner);

  // 4. Накатываем фасады управления и прокси-маршрутизации
  injectSynthMethodsToRackFacade(rack, adapter);
  injectRoutingMethodsToRackFacade(rack, adapter, state);

  return rack;
};

// --- ИТЕРАТОРЫ И ЖИЗНЕННЫЙ ЦИКЛ РЭКА ---

const buildRackFromTypeMap = (typeMap) => {
  const rack = {};
  const entries = Object.entries(typeMap);
  const totalEntries = entries.length;

  for (let i = 0; i < totalEntries; i++) {
    const [drumName, typeString] = entries[i];
    rack[drumName] = assembleSingleRackInstrument(drumName, typeString);
  }

  return rack;
};

const disposeAllRackContainers = (wrappedDrums) => {
  const containers = Object.values(wrappedDrums);
  const totalContainers = containers.length;

  for (let i = 0; i < totalContainers; i++) {
    const container = containers[i];
    if (hasDisposeMethod(container)) {
      container.dispose();
    }
  }
};

// --- ПУБЛИЧНЫЙ API КАНАЛА ---

const createDrums = () => {
  const wrappedDrums = buildRackFromTypeMap(DRUM_TYPE_MAP);

  return {
    ...wrappedDrums,
    dispose() {
      disposeAllRackContainers(wrappedDrums);
    },
  };
};

export default createDrums;
