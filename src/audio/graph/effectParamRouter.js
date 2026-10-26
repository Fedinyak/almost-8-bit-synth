import { WET_PARAM_KEY } from '../../constants/audioEngineConfig';
import {
  SOUND_PARAMS,
  TEXT_PARAM_DICTIONARIES,
} from '../../constants/soundParamsConfig';

// Реэкспорт для сохранения работоспособности внешних импортов приложения
export { applyEffectSettings } from '../bridge/effectSettingsApplier';

const PARAM_CONFIG_CACHE = {};
const WET_PARAM_CACHE = {};

// --- САМОДОКУМЕНТИРОВАННЫЕ ПРЕДИКАТЫ ---
const hasHardwareNodeKey = (config) => config && config.nodeKey;
const hasCustomLabel = (config) => config && config.label;
const isWetEffectParam = (config) =>
  config && config.isEffect && config.targetParam === WET_PARAM_KEY;

/**
 * Генерирует уникальный текстовый ключ для кэш-словаря параметров
 */
const buildCacheKey = (nodeKey, targetParam) => `${nodeKey}_${targetParam}`;

/**
 * Декларативно записывает конфигурацию в основной и альтернативный кэш-реестры
 */
const cacheParamByConfig = (config) => {
  const primaryKey = buildCacheKey(config.nodeKey, config.targetParam);
  PARAM_CONFIG_CACHE[primaryKey] = config;

  if (hasCustomLabel(config)) {
    const alternativeKey = buildCacheKey(config.label, config.targetParam);
    PARAM_CONFIG_CACHE[alternativeKey] = config;
  }
};

/**
 * Декларативно записывает системное имя wet-параметра в реестр эффектов
 */
const cacheWetParamName = (paramName, config) => {
  WET_PARAM_CACHE[config.nodeKey] = paramName;
};

// Плоский, читаемый сборщик кэш-карт
for (const [paramName, config] of Object.entries(SOUND_PARAMS)) {
  if (hasHardwareNodeKey(config)) {
    cacheParamByConfig(config);
  }

  if (isWetEffectParam(config)) {
    cacheWetParamName(paramName, config);
  }
}

/**
 * Высокопроизводительный прямой поиск конфигурации параметра без перебора массивов
 */
export const findParamConfig = (fxNode, targetParam) => {
  const nodeKey = fxNode.name || fxNode.label;
  if (!nodeKey) return null;

  const cacheKey = buildCacheKey(nodeKey, targetParam);
  return PARAM_CONFIG_CACHE[cacheKey] || null;
};

/**
 * Извлекает текстовое аудио-значение из словаря конфигураций
 */
export const getDictionaryAudioValue = (config, textValue) => {
  const dict = TEXT_PARAM_DICTIONARIES[config.dictionaryKey];
  return dict ? dict.audioValues[textValue] : undefined;
};

/**
 * Находит имя соответствующего мок-параметра wet через оптимизированную кэш-карту
 */
export const findMainWetParamName = (nodeKey) => WET_PARAM_CACHE[nodeKey];
