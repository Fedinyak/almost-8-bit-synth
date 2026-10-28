import {
  applyDynamicBypass,
  applySynthEnvelope,
} from '../bridge/audioModulationActions';
import { SOUND_PARAMS } from '../../constants/soundParamsConfig';

// --- СИСТЕМНЫЕ МАТЕМАТИЧЕСКИЕ КОНСТАНТЫ ---
const SMOOTHING_FACTOR = 0.15;
const DEFAULT_LFO_DEPTH = 0.5;
const HALF_RANGE_COEFFICIENT = 0.5;

// --- ВНУТРЕННИЕ ПРЕДИКАТЫ (ПРОВЕРКИ СОСТОЯНИЯ) ---

const isLfoProcessingRequired = (settings, instance, targetParam) =>
  settings.lfoActive && instance.masterLfoMeter && targetParam;

// --- ЧИСТЫЕ ФУНКЦИОНАЛЬНЫЕ ВЫЧИСЛЕНИЯ (PURE FP MATH) ---

const calculateModulatedValue = (
  baseValue,
  lfoPhase,
  fullRange,
  currentDepth,
  minVal,
  maxVal,
) => {
  const modulationAmount =
    lfoPhase * (fullRange * HALF_RANGE_COEFFICIENT * currentDepth);
  const rawTarget = baseValue + modulationAmount;
  return Math.max(minVal, Math.min(maxVal, rawTarget));
};

const getParamBoundaries = (targetParam) => {
  const config = SOUND_PARAMS[targetParam];
  return {
    minVal: config?.min ?? 0,
    maxVal: config?.max ?? 1,
    defaultVal: config?.default ?? 0,
    isText: config?.isTextParam ?? false,
  };
};

// --- СЛУЖЕБНЫЕ ИЗОЛИРОВАННЫЕ ОПЕРАЦИИ (COMPONENTS LAYER) ---

const configurePhysicalLfoDevice = (masterLfo, settings) => {
  if (!masterLfo) return;

  if (settings.lfoRate !== undefined) {
    masterLfo.frequency.value = settings.lfoRate;
  }
  if (
    settings.lfoWaveform !== undefined &&
    masterLfo.type !== settings.lfoWaveform
  ) {
    masterLfo.type = settings.lfoWaveform;
  }
};

const applyLfoModulationStep = (
  name,
  targetParam,
  settings,
  instance,
  smoothedValues,
) => {
  const lfoPhase = instance.masterLfoMeter.getValue();
  const currentDepth = settings.lfoDepth ?? DEFAULT_LFO_DEPTH;

  const { minVal, maxVal, defaultVal, isText } =
    getParamBoundaries(targetParam);
  const fullRange = maxVal - minVal;
  const baseValue = settings[targetParam] ?? defaultVal;

  let targetModulated = calculateModulatedValue(
    baseValue,
    lfoPhase,
    fullRange,
    currentDepth,
    minVal,
    maxVal,
  );

  if (isText) {
    targetModulated = Math.round(targetModulated);
  }

  // Инициализация структуры сглаживания без выделения памяти под новые строки
  if (!smoothedValues[name]) {
    smoothedValues[name] = {};
  }
  if (smoothedValues[name][targetParam] === undefined) {
    smoothedValues[name][targetParam] = targetModulated;
  }

  // Линейная инерция против цифрового треска
  smoothedValues[name][targetParam] +=
    (targetModulated - smoothedValues[name][targetParam]) * SMOOTHING_FACTOR;

  // Применяем мутацию непосредственно в рабочий объект настроек
  settings[targetParam] = smoothedValues[name][targetParam];
};

const applyChannelOutflow = (name, instance, settings) => {
  applySynthEnvelope(instance, settings);
  applyDynamicBypass(name, instance, settings);
};

// --- ГЛАВНЫЙ СЛУЖЕБНЫЙ ИНТЕРФЕЙС МОДУЛЯЦИИ ---

/**
 * Высокопроизводительный процессор LFO-модуляции и сглаживания цифрового треска.
 * Полностью декомпозирован на чистые подмодули, реализует Zero-Allocation.
 */
export const processInstrumentLfoModulation = ({
  name,
  instance,
  settings,
  smoothedValues,
}) => {
  if (!instance || !settings) return;

  configurePhysicalLfoDevice(instance.masterLfo, settings);

  const targetParam = settings.lfoTarget;
  if (isLfoProcessingRequired(settings, instance, targetParam)) {
    applyLfoModulationStep(
      name,
      targetParam,
      settings,
      instance,
      smoothedValues,
    );
  }

  applyChannelOutflow(name, instance, settings);
};
