import * as Tone from 'tone';

// Утилита последовательного соединения аудио-узлов (нативных или Tone.js)
export const connectAudioChain = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length < 2) return;
  for (let i = 0; i < nodes.length - 1; i++) {
    if (typeof nodes[i].connect === 'function') nodes[i].connect(nodes[i + 1]);
  }
  if (
    nodes[nodes.length - 1] &&
    typeof nodes[nodes.length - 1].toDestination === 'function'
  ) {
    nodes[nodes.length - 1].toDestination();
  }
};

const resetEffectMix = (node) => {
  if (node && node.wet) node.set({ wet: 0 });
};

const bypassAudioNode = (node) => {
  if (node) node.bypassed = true;
};

export const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);
  resetEffectMix(node);
  bypassAudioNode(node);
  return node;
};

// Единая фабрика сборки эффектов для инструментов
export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
) => {
  const fxRegistry = {};
  const audioEffectsChain = effectsChain.filter((key) => key !== 'testLfo');

  const createdEffects = audioEffectsChain
    .map((deviceKey) => {
      const device = effectDevices[deviceKey];
      if (!device) return null;
      const node = createSleeperNode(device.ClassRef, {
        ...device.defaultParams,
        ...(instrumentPreset?.[deviceKey] || {}),
      });
      fxRegistry[device.nodeKey] = node;
      return node;
    })
    .filter(Boolean);

  const hardwareStaticPanner = new Tone.Panner(0);
  const fullGraphChain = [rawSynth, ...createdEffects, hardwareStaticPanner];
  connectAudioChain(fullGraphChain);

  // Статичные заглушки вынесены из области видимости функции, чтобы не плодить мусорные объекты в куче (Heap)
  const fakeLfoNode = {
    _param: { value: 0 },
    frequency: { value: 5.0 },
    amplitude: { value: 1.0 },
    get value() {
      return 0;
    },
    set value(val) {},
    start: () => {},
    stop: () => {},
    connect: () => {},
    disconnect: () => {},
    dispose: () => {},
  };
  const fakeLfoMeter = { getValue: () => 0, dispose: () => {} };

  return {
    instrument: rawSynth,
    ...fxRegistry,
    panner: hardwareStaticPanner,
    masterLfo: fakeLfoNode,
    masterLfoMeter: fakeLfoMeter,
    output: hardwareStaticPanner,
    dispose() {
      if (typeof hardwareStaticPanner.dispose === 'function') {
        hardwareStaticPanner.dispose();
      }
      createdEffects.forEach((node) => {
        if (node && typeof node.dispose === 'function') node.dispose();
      });
      if (rawSynth && typeof rawSynth.dispose === 'function') {
        rawSynth.dispose();
      }
    },
  };
};
