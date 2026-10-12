import { triggerDrumVisualLevel } from '../core/audioEngineCore';
import { compensateLatency } from '../../utils/audioMathUtils';
import { getNativeContext } from '../core/nativeContext';

// --- ЛОКАЛЬНЫЕ ПРЕДИКАТЫ И ВАЛИДАТОРЫ ---

const isSynthInvalid = (synth) => !synth || !synth.instrument;
const isDrumMissing = (engine, instrumentName) =>
  !engine || !engine[instrumentName] || !engine[instrumentName].instrument;
const isVisualTriggerActive = (drumIndex) => typeof drumIndex === 'number';
const isOutputNodeMissing = (instance) => !instance || !instance.output;
const isAudioNodeConnectable = (node) =>
  node && typeof node.connect === 'function';

// --- ВЫНЕСЕННЫЕ ХЕЛПЕРЫ АУДИО-КОНВЕЙЕРА (ПОВЕДЕНИЕ) ---

// Безопасное разрывание старых кабелей коммутации Web Audio API
const safelyDisconnectOutput = (outputNode) => {
  if (typeof outputNode.disconnect === 'function') {
    try {
      outputNode.disconnect();
    } catch (e) {}
  }
};

// Пайка сигнального тракта через гибридный мост Tone.js
const routeThroughToneMixerChannel = (outputNode, channel, analyser) => {
  outputNode.connect(channel);

  if (analyser) {
    channel.connect(analyser);
  }

  if (typeof channel.toDestination === 'function') {
    channel.toDestination();
  }
};

// Пайка сигнального тракта через нативное Web Audio API, когда Tone.js вырезан из микшера
const routeThroughNativeMixerChannel = (ctx, outputNode, channel, analyser) => {
  if (!isAudioNodeConnectable(channel)) return;

  outputNode.connect(channel);
  if (analyser) channel.connect(analyser);
  channel.connect(ctx.destination);
};

// Аварийная подстраховка, если на стыке гибридных движков произошел аппаратный сбой
const handleMixerConnectionError = (channel) => {
  if (channel && typeof channel.toDestination === 'function') {
    try {
      channel.toDestination();
    } catch (e) {}
  }
};

// --- ПУБЛИЧНЫЙ API ТРИГГЕРОВ ВОСПРОИЗВЕДЕНИЯ ---

export const playSynthNote = (synth, time, noteData) => {
  if (isSynthInvalid(synth)) return;

  synth.instrument.triggerAttackRelease(noteData.note, noteData.duration, time);
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};

export const processDrumPlaybackHit = (
  time,
  noteData,
  engine,
  drumNoteMap,
  release,
) => {
  const instrumentName = drumNoteMap[noteData.note];
  if (isDrumMissing(engine, instrumentName)) return;

  const { instrument } = engine[instrumentName];
  const playTime = compensateLatency(time);

  playDrumHit(instrument, release, playTime);

  if (isVisualTriggerActive(noteData.drumIndex)) {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
};

// --- НАВЕДЕНИЕ ПОРЯДКА В КОММУТАЦИИ МИКШЕРА ---
export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (isOutputNodeMissing(synthInstance)) return;

  const { output } = synthInstance;
  safelyDisconnectOutput(output);

  try {
    if (isAudioNodeConnectable(channel)) {
      routeThroughToneMixerChannel(output, channel, analyser);
    } else {
      const ctx = getNativeContext();
      routeThroughNativeMixerChannel(ctx, output, channel, analyser);
    }
  } catch (err) {
    handleMixerConnectionError(channel);
  }
};
