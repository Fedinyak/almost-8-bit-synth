import * as Tone from 'tone';
import {
  DRUM_PRESETS,
  EFFECT_DEVICES,
  DRUM_EFFECTS_CHAIN,
  DRUM_TYPE_MAP,
} from '../constants/soundParamsConfig';

const TONE_CLASS_RESOLVER = {
  MembraneSynth: Tone.MembraneSynth,
  NoiseSynth: Tone.NoiseSynth,
  MetalSynth: Tone.MetalSynth,
};

const resetEffectMix = (node) => {
  if (node.wet) {
    node.set({ wet: 0 });
  }
};

const bypassAudioNode = (node) => {
  node.bypassed = true;
};

const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);

  resetEffectMix(node);
  bypassAudioNode(node);

  return node;
};

const connectAudioChain = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length < 2) return;

  nodes.reduce((prevNode, currentNode) => {
    prevNode.connect(currentNode);
    return currentNode;
  });

  nodes[nodes.length - 1].toDestination();
};

const buildDeviceParams = (drumName, deviceKey, defaultParams) => {
  const customParams = DRUM_PRESETS[drumName]?.[deviceKey] || {};
  return { ...defaultParams, ...customParams };
};

const registerNodeInRegistry = (registry, nodeKey, node) => {
  registry[nodeKey] = node;
};

const wrapDrumWithEffects = (rawSynth, drumName) => {
  const fxRegistry = {};

  const createdEffects = DRUM_EFFECTS_CHAIN.map((deviceKey) => {
    const device = EFFECT_DEVICES[deviceKey];
    if (!device) return null;

    const finalParams = buildDeviceParams(
      drumName,
      deviceKey,
      device.defaultParams,
    );
    const node = createSleeperNode(device.ClassRef, finalParams);

    registerNodeInRegistry(fxRegistry, device.nodeKey, node);

    return node;
  }).filter(Boolean);

  connectAudioChain([rawSynth, ...createdEffects]);

  return {
    instrument: rawSynth,
    ...fxRegistry,
    output: createdEffects[createdEffects.length - 1] || rawSynth,
    dispose() {
      createdEffects.forEach((node) => node.dispose());
      rawSynth.dispose();
    },
  };
};

const initializeRawDrumSynths = (typeMap) => {
  return Object.entries(typeMap).reduce((acc, [drumName, typeString]) => {
    const presetConfig = DRUM_PRESETS[drumName] || {};
    const SynthClass = TONE_CLASS_RESOLVER[typeString] || Tone.MembraneSynth;

    acc[drumName] = new SynthClass(presetConfig);
    return acc;
  }, {});
};

const buildWrappedDrumsRack = (drumSynths) => {
  return Object.entries(drumSynths).reduce((acc, [drumName, rawSynth]) => {
    acc[drumName] = wrapDrumWithEffects(rawSynth, drumName);
    return acc;
  }, {});
};

const createDrums = () => {
  const drumSynths = initializeRawDrumSynths(DRUM_TYPE_MAP);
  const wrappedDrums = buildWrappedDrumsRack(drumSynths);

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
