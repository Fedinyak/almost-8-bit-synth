import * as Tone from 'tone';
import { LOOKAHEAD_OFFSET_SEC } from '../constants/constants';
import { drumLevels } from './visualizerState';

export const createPlaybackTrack = (onStepAction) => {
  const track = new Tone.Part(onStepAction, []).start(0);
  track.loop = true;
  return track;
};

export const scheduleFrame = (time, drawFunction) =>
  Tone.Draw.schedule(drawFunction, time);

export const triggerDrumVisualLevel = (drumIndex, time) => {
  Tone.Draw.schedule(() => {
    drumLevels[drumIndex] = 1.0;
  }, time);
};

export const startDrawingLoop = (callback, rate) =>
  Tone.Transport.scheduleRepeat(callback, rate);

export const stopDrawingLoop = (id) => Tone.Transport.clear(id);

export const setEngineBpm = (bpmValue) => {
  Tone.Transport.bpm.value = bpmValue;
};

export const setPlayState = (state) => {
  if (state === 'start') {
    Tone.Transport.start();
  } else if (state === 'pause') {
    Tone.Transport.pause();
  } else {
    Tone.Transport.stop();
  }
};

export const clearTrackNotes = (track) => {
  track.clear();
};

export const writeNoteToTrack = (track, time, noteData) => {
  track.add(time, noteData);
};

export const setTrackLoopDuration = (track, numberOfMeasures) => {
  track.loopEnd = `${numberOfMeasures}m`;
};

export const setEnginePosition = (patternIndex) => {
  const patternStartTimeInSeconds = Tone.Time(`${patternIndex}m`).toSeconds();

  const quantizedJumpTime = Math.max(
    0,
    patternStartTimeInSeconds - LOOKAHEAD_OFFSET_SEC,
  );

  setGlobalTransportTime(quantizedJumpTime);
};

export const setGlobalTransportTime = (seconds) => {
  Tone.Transport.seconds = seconds;
};

export const enableEngineLoop = (patternIndex) => {
  Tone.Transport.loopStart = `${patternIndex}m`;
  Tone.Transport.loopEnd = `${patternIndex + 1}m`;
  Tone.Transport.loop = true;
};

export const disableEngineLoop = () => {
  Tone.Transport.loop = false;
};

export const enableGlobalTransportLoop = (numberOfMeasures) => {
  Tone.Transport.loopStart = `0m`;
  Tone.Transport.loopEnd = `${numberOfMeasures}m`;
  Tone.Transport.loop = true;
};

const resetEffectMix = (node) => {
  if (node.wet) {
    node.set({ wet: 0 });
  }
};

const bypassAudioNode = (node) => {
  node.bypassed = true;
};

export const createSleeperNode = (EffectClass, constructorParams) => {
  const node = new EffectClass(constructorParams);
  resetEffectMix(node);
  bypassAudioNode(node);
  return node;
};

export const connectAudioChain = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length < 2) return;

  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].connect(nodes[i + 1]);
  }

  nodes[nodes.length - 1].toDestination();
};

const buildDeviceParams = (instrumentPreset, deviceKey, defaultParams) => {
  const customParams = instrumentPreset?.[deviceKey] || {};
  return { ...defaultParams, ...customParams };
};

export const wrapInstrumentWithEffects = (
  rawSynth,
  instrumentPreset,
  effectsChain,
  effectDevices,
) => {
  const fxRegistry = {};

  // Очищаем сквозную цепочку аудиоэффектов от тестовых модуляторов
  const audioEffectsChain = effectsChain.filter((key) => key !== 'testLfo');

  const createdEffects = audioEffectsChain
    .map((deviceKey) => {
      const device = effectDevices[deviceKey];
      if (!device) return null;

      const finalParams = buildDeviceParams(
        instrumentPreset,
        deviceKey,
        device.defaultParams,
      );
      const node = createSleeperNode(device.ClassRef, finalParams);

      fxRegistry[device.nodeKey] = node;

      return node;
    })
    .filter(Boolean);

  connectAudioChain([rawSynth, ...createdEffects]);

  // Интеграция единого независимого Master LFO для матрицы модуляции инструмента
  const masterLfoNode = new Tone.LFO({
    type: 'sine',
    frequency: 5.0,
    min: -1,
    max: 1,
  });

  // Настраиваем измеритель на перехват чистых числовых значений вольтажа волны
  const masterLfoMeter = new Tone.Meter({ type: 'value' });
  masterLfoNode.connect(masterLfoMeter);

  try {
    masterLfoNode.start();
  } catch (e) {}

  return {
    instrument: rawSynth,
    ...fxRegistry,
    masterLfo: masterLfoNode,
    masterLfoMeter: masterLfoMeter,
    output: createdEffects[createdEffects.length - 1] || rawSynth,
    dispose() {
      masterLfoNode.dispose();
      masterLfoMeter.dispose();
      createdEffects.forEach((node) => node.dispose());
      rawSynth.dispose();
    },
  };
};
