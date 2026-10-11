import * as Tone from 'tone';
// Импортируем чистые утилиты пайки
import { connectAudioChain, createSleeperNode } from './audioGraphUtils';

// --- МУЗЫКАЛЬНЫЕ КОНСТАНТЫ СТЕРЕО-ГРАФА ---
const PANNER_CENTER_POSITION = 0; // Центральное положение стереопанорамы по умолчанию

const FAKE_LFO_DEFAULT_VALUE = 0; // Дефолтное нулевое значение параметра заглушки LFO
const FAKE_LFO_INITIAL_FREQ_HZ = 5.0; // Стартовая частота модуляции в Герцах
const FAKE_LFO_MAX_AMPLITUDE = 1.0; // Максимальный коэффициент глубины волны модуляции

/**
 * Создает, конфигурирует и регистрирует одиночную ноду эффекта
 */
const buildSingleEffectNode = (
  deviceKey,
  instrumentPreset,
  effectDevices,
  fxRegistry,
) => {
  const device = effectDevices[deviceKey];
  if (!device) return null;

  const node = createSleeperNode(device.ClassRef, {
    ...device.defaultParams,
    ...(instrumentPreset?.[deviceKey] || {}),
  });

  fxRegistry[device.nodeKey] = node;
  return node;
};

/**
 * Единая фабрика сборки эффектов для инструментов
 */
export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
) => {
  const fxRegistry = {};
  const audioEffectsChain = effectsChain.filter((key) => key !== 'testLfo');

  // Плоский, читаемый маппинг
  const createdEffects = audioEffectsChain
    .map((deviceKey) =>
      buildSingleEffectNode(
        deviceKey,
        instrumentPreset,
        effectDevices,
        fxRegistry,
      ),
    )
    .filter(Boolean);

  // Стыкуем собранный рэк со стерео-паннером
  const hardwareStaticPanner = new Tone.Panner(PANNER_CENTER_POSITION);
  const fullGraphChain = [rawSynth, ...createdEffects, hardwareStaticPanner];
  connectAudioChain(fullGraphChain);

  // Статичные заглушки модуляции
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

  // Локальный хелпер для безопасного уничтожения аудио-нод
  const safelyDisposeNode = (node) => {
    if (node && typeof node.dispose === 'function') {
      node.dispose();
    }
  };

  return {
    instrument: rawSynth,
    ...fxRegistry,
    panner: hardwareStaticPanner,
    masterLfo: fakeLfoNode,
    masterLfoMeter: fakeLfoMeter,
    output: hardwareStaticPanner,
    dispose() {
      safelyDisposeNode(hardwareStaticPanner);
      createdEffects.forEach(safelyDisposeNode);
      safelyDisposeNode(rawSynth);
    },
  };
};
