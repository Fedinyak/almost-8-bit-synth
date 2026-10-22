import createSynth from '../engines/synthEngine';
import createDrums from '../engines/drumEngine';
import { SYNTH_LIST } from '../../constants/constants';
import { buildVirtualHardwareRegistry } from './effectsRackStubs';

// --- ВНУТРЕННЕЕ ИЗОЛИРОВАННОЕ СОСТОЯНИЕ МОДУЛЯ ---
let synthsRegistry = {};
let drumsRegistry = null;
let isInitialized = false;

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---
const hasDisposeMethod = (node) => node && typeof node.dispose === 'function';

// --- ЧИСТЫЕ ФУНКЦИОНАЛЬНЫЕ СБОРЩИКИ (PURE FP CONSTRUCTORS) ---

/**
 * Инициализирует инстанс конкретного синтезатора и маскирует его UI-заглушками
 */
const buildSingleSynth = (synthName) => {
  const synthInstance = createSynth(synthName);
  const virtualFxRegistry = buildVirtualHardwareRegistry();

  return Object.assign(synthInstance, virtualFxRegistry);
};

/**
 * Декларативно собирает полную карту синтезаторов на основе глобального списка констант
 */
const buildSynthsMap = (synthNamesList) => {
  const synthsMap = {};
  const totalSynths = synthNamesList.length;

  for (let i = 0; i < totalSynths; i++) {
    const name = synthNamesList[i];
    synthsMap[name] = buildSingleSynth(name);
  }

  return synthsMap;
};

// --- СИСТЕМНЫЕ ОПЕРАЦИИ ОЧИСТКИ ПАМЯТИ ---

const safelyDisposeNode = (node) => {
  if (hasDisposeMethod(node)) {
    node.dispose();
  }
};

const disposeAllSynthsInRegistry = (registry) => {
  const synthInstances = Object.values(registry);
  const totalSynths = synthInstances.length;

  for (let i = 0; i < totalSynths; i++) {
    safelyDisposeNode(synthInstances[i]);
  }
};

// --- ОРКЕСТРАЦИЯ ЖИЗНЕННОГО ЦИКЛА ЯДРА ---

const ensureInitialized = () => {
  if (isInitialized) return;

  synthsRegistry = buildSynthsMap(SYNTH_LIST);
  drumsRegistry = createDrums();
  isInitialized = true;
};

// --- ПУБЛИЧНЫЙ API АУДИО-ПРОВОДНИКА (FACADE) ---

export const audioCore = {
  get synths() {
    ensureInitialized();
    return synthsRegistry;
  },

  get drums() {
    ensureInitialized();
    return drumsRegistry;
  },

  /**
   * Тотальный сброс памяти — выгрузка нативных аудио-узлов из ОЗУ
   */
  forceDisposeAll() {
    disposeAllSynthsInRegistry(synthsRegistry);
    safelyDisposeNode(drumsRegistry);

    synthsRegistry = {};
    drumsRegistry = null;
    isInitialized = false;
  },
};
