// --- НА ТИВНАЯ ЗАЧИСТКА TONE.JS (ФИНАЛЬНЫЙ СТАТУС: БИБЛИОТЕКА ПОЛНОСТЬЮ ВЫРЕЗАНА) ---
import { connectAudioChain, createSleeperNode } from './audioGraphUtils';
import { getNativeContext } from './nativeContext'; // Твой родной синглтон нативного контекста

const PANNER_CENTER_POSITION = 0;
const FAKE_LFO_DEFAULT_VALUE = 0;
const FAKE_LFO_INITIAL_FREQ_HZ = 5.0;
const FAKE_LFO_MAX_AMPLITUDE = 1.0;

/**
 * Единая фабрика сборки эффектов для инструментов (ПОЛНОСТЬЮ НА ТИВНАЯ ВЕРСИЯ)
 */
export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
) => {
  const fxRegistry = {};

  // ИСПРАВЛЕНО: Извлекаем аудиоконтекст строго нативными методами браузера
  const ctx =
    getNativeContext() || window.audioContext || window.webkitAudioContext;

  // Создаем чистый нативный Gain-узел, который заменяет рэк и панораму
  const cleanOutputGain = ctx.createGain();
  cleanOutputGain.gain.value = 1.0; // Сигнал идет со 100% громкостью, звук не пропадет

  // Соединяем выход синта напрямую с нативным сквозным гейном рэка
  if (rawSynth && typeof rawSynth.connect === 'function') {
    rawSynth.connect(cleanOutputGain);
  }

  // =========================================================================
  // ОБМАН ИНТЕРФЕЙСА: Легкие JS-пустышки вместо тяжелых эффектов Tone.js
  // Это полностью страхует React и Redux от ошибок чтения свойств "undefined"
  // =========================================================================
  const createParamStub = () => ({
    bypassed: true,
    wet: 0.0,
    set(params) {
      return this;
    }, // Проглатываем прямые вызовы .set() из крутилок
    dispose: () => {},
  });

  // Забиваем реестр пустышками, чтобы UI-слайдеры на экране не падали в рантайме
  fxRegistry['fxDistortion'] = createParamStub();
  fxRegistry['fxSaturator'] = createParamStub();
  fxRegistry['fxBitcrusher'] = createParamStub();

  // Статичные заглушки модуляции для совместимости со старой структурой возвращаемого объекта
  const fakeLfoNode = {
    _param: { value: FAKE_LFO_DEFAULT_VALUE },
    frequency: { value: FAKE_LFO_INITIAL_FREQ_HZ },
    amplitude: { value: FAKE_LFO_MAX_AMPLITUDE },
    get value() {
      return FAKE_LFO_DEFAULT_VALUE;
    },
    set value(val) {},
    start: () => {},
    stop: () => {},
    connect: () => {},
    disconnect: () => {},
    dispose: () => {},
  };
  const fakeLfoMeter = {
    getValue: () => FAKE_LFO_DEFAULT_VALUE,
    dispose: () => {},
  };

  return {
    instrument: rawSynth,
    ...fxRegistry,
    panner: cleanOutputGain, // Подменяем паннер нативным сквозным гейном
    masterLfo: fakeLfoNode,
    masterLfoMeter: fakeLfoMeter,
    output: cleanOutputGain, // Финальным выходом канала становится нативный гейн
    dispose() {
      try {
        cleanOutputGain.disconnect();
        if (rawSynth && typeof rawSynth.dispose === 'function')
          rawSynth.dispose();
      } catch (e) {}
    },
  };
};
