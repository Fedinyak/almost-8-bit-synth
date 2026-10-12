import {
  applyDynamicBypass,
  applySynthEnvelope,
} from '../playback/audioModulationActions';
import { SOUND_PARAMS } from '../../constants/soundParamsConfig';

// Чистая функция обработки LFO и сглаживания треска для одного аудио-узла
export const processInstrumentLfoModulation = ({
  name,
  instance,
  settings,
  smoothedValues,
}) => {
  if (!instance || !settings) return;

  // 1. Настройка физического LFO устройства
  if (instance.masterLfo) {
    if (settings.lfoRate !== undefined) {
      instance.masterLfo.frequency.value = settings.lfoRate;
    }
    if (
      settings.lfoWaveform !== undefined &&
      instance.masterLfo.type !== settings.lfoWaveform
    ) {
      instance.masterLfo.type = settings.lfoWaveform;
    }
  }

  let runtimeSettings = { ...settings };

  // 2. Матрица модуляции параметров звука волной LFO
  if (settings.lfoActive && instance.masterLfoMeter && settings.lfoTarget) {
    const targetParam = settings.lfoTarget;
    const lfoPhase = instance.masterLfoMeter.getValue();
    const currentDepth = settings.lfoDepth ?? 0.5;

    const paramConfig = SOUND_PARAMS[targetParam] || { min: 0, max: 1 };
    const minVal = paramConfig.min ?? 0;
    const maxVal = paramConfig.max ?? 1;
    const fullRange = maxVal - minVal;

    const baseValue = settings[targetParam] ?? paramConfig.default ?? 0;

    let targetModulated =
      baseValue + lfoPhase * (fullRange * 0.5 * currentDepth);
    targetModulated = Math.max(minVal, Math.min(maxVal, targetModulated));

    if (paramConfig.isTextParam) {
      targetModulated = Math.round(targetModulated);
    }

    // Линейный фильтр инерции (ФИКС ЦИФРОВОГО ТРЕСКА)
    const cacheKey = `${name}_${targetParam}`;
    if (smoothedValues[cacheKey] === undefined) {
      smoothedValues[cacheKey] = targetModulated;
    }

    // Мягко подползаем к новой точке волны
    smoothedValues[cacheKey] +=
      (targetModulated - smoothedValues[cacheKey]) * 0.15;
    runtimeSettings[targetParam] = smoothedValues[cacheKey];
  }

  // 3. Применение огибающих и динамического байпаса (0% ЦП)
  applySynthEnvelope(instance, runtimeSettings);
  applyDynamicBypass(name, instance, runtimeSettings);
};
