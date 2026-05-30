import * as Tone from 'tone';
import {
  DRUM_PRESETS,
  EFFECT_DEVICES,
  DRUM_EFFECTS_CHAIN,
} from '../constants/soundParamsConfig';

// Универсальная слепая фабрика: собирает любой спящий аудио-узел Tone.js по его шаблону
const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);

  // Умный предохранитель: гасим wet в ноль, только если этот параметр существует у эффекта
  if (node.wet) {
    node.set({ wet: 0 });
  }

  // Аппаратно усыпляем узел для 0% нагрузки на процессор на старте
  node.bypassed = true;
  return node;
};

// Автоматически соединяет любой массив аудио-узлов "паровозиком" через .reduce()
const connectAudioChain = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length < 2) return;

  nodes.reduce((prevNode, currentNode) => {
    prevNode.connect(currentNode);
    return currentNode;
  });

  nodes[nodes.length - 1].toDestination();
};

/**
 * Вспомогательная фабрика-обертка: собирает чистую цепочку эффектов вокруг синта барабана.
 */
const wrapDrumWithEffects = (rawSynth, drumName) => {
  // Локальный реестр для динамической сборки контейнера (fxBitcrusher, fxDelay и т.д.)
  const fxRegistry = {};

  // 🦾 ТОТАЛЬНО ДИНАМИЧЕСКИЙ СПАВН: Бежим по нашему манифесту строк из констант ['crusher', 'filter', 'delay']
  const createdEffects = DRUM_EFFECTS_CHAIN.map((deviceKey) => {
    const device = EFFECT_DEVICES[deviceKey];
    if (!device) return null;

    // Вытаскиваем специфические стартовые пресеты прибора для конкретного барабана из DRUM_PRESETS, если они там есть
    const customParams = DRUM_PRESETS[drumName]?.[deviceKey] || {};
    // Объединяем пресет с базовыми дефолтными настройками прибора
    const finalParams = { ...device.defaultParams, ...customParams };

    // Создаем спящий узел одной универсальной строчкой
    const node = createSleeperNode(device.ClassRef, finalParams);

    // Автоматически регистрируем живую ссылку по её nodeKey для хука модуляции
    fxRegistry[device.nodeKey] = node;

    return node;
  }).filter(Boolean); // На всякий случай отсекаем null

  // Соединяем нативный синт и весь массив созданных эффектов "паровозиком"
  connectAudioChain([rawSynth, ...createdEffects]);

  return {
    instrument: rawSynth,
    ...fxRegistry, // Раскрываем ссылки (fxBitcrusher, fxFilter, fxDelay) наружу для Redux
    output: createdEffects[createdEffects.length - 1] || rawSynth, // Крайний эффект становится выходом
    dispose() {
      createdEffects.forEach((node) => node.dispose());
      rawSynth.dispose();
    },
  };
};

const createDrums = () => {
  const DRUM_TYPE_MAP = {
    kick: Tone.MembraneSynth,
    snare: Tone.NoiseSynth,
    hiHat: Tone.MetalSynth,
    hiHatClose: Tone.MetalSynth,
    hiHatOpen: Tone.MetalSynth,
    crash: Tone.MetalSynth,
    ride: Tone.MetalSynth,
    tom: Tone.MembraneSynth,
  };

  const drumSynths = Object.entries(DRUM_TYPE_MAP).reduce(
    (acc, [drumName, SynthClass]) => {
      const presetConfig = DRUM_PRESETS[drumName] || {};

      acc[drumName] = new SynthClass(presetConfig);
      return acc;
    },
    {},
  );

  // Передаем во wrapDrumWithEffects имя конкретного барабана для поиска его уникальных параметров
  const wrappedDrums = Object.entries(drumSynths).reduce(
    (acc, [drumName, rawSynth]) => {
      acc[drumName] = wrapDrumWithEffects(rawSynth, drumName);
      return acc;
    },
    {},
  );

  return {
    ...wrappedDrums,
    dispose() {
      Object.values(wrappedDrums).forEach((drumContainer) => {
        if (drumContainer && typeof drumContainer.dispose === 'function') {
          drumContainer.dispose();
        }
      });
    },
  };
};

export default createDrums;
