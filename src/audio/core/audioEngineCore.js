import * as Tone from 'tone'; // Оставляем строго для wrapInstrumentWithEffects
import { LOOKAHEAD_OFFSET_SEC } from '../../constants/constants';
import { drumLevels } from '../sync/visualizerState';
import { getNativeContext } from './nativeContext';

// --- НАДРОДНЫЙ СТЕЙТ ЧАСОВ ---
let schedulerTimerId = null;
let isPlaying = false;

export let currentBpm = 120;
const BASE_BPM = 120; // 🌟 ЗАКОН: Все внутренние секунды нот и длин всегда считаются под 120 BPM!

let trackTimeSeconds = 0;
let lastContextTime = 0;

// Длины лупов жестко привязаны к сетке BASE_BPM (120), под которую скомпилированы ноты в проекте
let totalTrackDurationSeconds = 4.0 * (60 / BASE_BPM) * 4;
let loopStartSeconds = 0;
let loopEndSeconds = totalTrackDurationSeconds;
let isPatternLoopEnabled = false;

const LOOKAHEAD_WINDOW_SEC = 0.1;
const SCHEDULER_INTERVAL_MS = 25;

const activeTracks = new Set();
const nativeDrawingCallbacks = new Map();
let lastScheduledDrawingTime = -0.001;
let lastSentStepIndex = -1;

export const getCurrentEngineBpm = () => currentBpm;

// Главный цикл Look-Ahead планировщика
const runSchedulerLoop = () => {
  if (!isPlaying) return;

  const ctx = getNativeContext();
  const now = ctx.currentTime;

  const delta = now - lastContextTime;
  lastContextTime = now;

  // Время бежит со скоростью, пропорциональной выбранному BPM относительно базовых 120
  const bpmRatio = currentBpm / BASE_BPM;
  trackTimeSeconds += delta * bpmRatio;

  const activeStart = isPatternLoopEnabled ? loopStartSeconds : 0;
  const activeEnd = isPatternLoopEnabled
    ? loopEndSeconds
    : totalTrackDurationSeconds;
  const loopLength = activeEnd - activeStart;

  // Бесшовный сдвиг лупа по фиксированным границам 120 BPM сетки
  if (trackTimeSeconds >= activeEnd) {
    trackTimeSeconds = activeStart + (trackTimeSeconds - activeEnd);
    activeTracks.forEach((track) => {
      track.lastScheduledTime -= loopLength;
    });
    lastScheduledDrawingTime -= loopLength;
  }

  const scheduleUntilTime = trackTimeSeconds + LOOKAHEAD_WINDOW_SEC;

  // 1. Планируем звук (передаем bpmRatio для правильного сжатия физического времени в Web Audio)
  activeTracks.forEach((track) => {
    track._processSchedule(
      trackTimeSeconds,
      scheduleUntilTime,
      now,
      activeStart,
      activeEnd,
      loopLength,
      bpmRatio,
    );
  });

  // 2. Планируем графику строго по фиксированной сетке шагов 120 BPM
  const secondsPerStep = 60 / BASE_BPM / 4;
  let nextStepTime =
    Math.ceil(lastScheduledDrawingTime / secondsPerStep) * secondsPerStep;
  if (nextStepTime <= lastScheduledDrawingTime) {
    nextStepTime += secondsPerStep;
  }

  while (nextStepTime <= scheduleUntilTime) {
    if (nextStepTime > lastScheduledDrawingTime) {
      nativeDrawingCallbacks.forEach((callback) => {
        const stepTimeCapture = nextStepTime;
        scheduleFrame(stepTimeCapture, () => {
          if (isPlaying) {
            // Вычисляем текущий индекс шага на основе ИДЕАЛЬНОГО запланированного времени шага,
            // полностью исключая дрейф и микросекундные погрешности физических таймеров!
            const currentStepIndex = Math.floor(
              stepTimeCapture / secondsPerStep,
            );

            if (currentStepIndex !== lastSentStepIndex) {
              lastSentStepIndex = currentStepIndex;
              // Передаем в React идеальное квантованное время начала этого шага
              callback(currentStepIndex * secondsPerStep);
            }
          }
        });
      });
      lastScheduledDrawingTime = nextStepTime;
    }
    nextStepTime += secondsPerStep;
  }
};

// --- НАДРОДНАЯ СИМУЛЯЦИЯ ТРЕКА ---
class NativePlaybackTrack {
  constructor(onStepAction) {
    this.onStepAction = onStepAction;
    this.notes = [];
    this.lastScheduledTime = -0.05;
  }

  clear() {
    this.notes = [];
    this.lastScheduledTime = trackTimeSeconds - 0.05;
  }

  add(timeInSeconds, noteData) {
    this.notes.push({ time: timeInSeconds, data: noteData });
    this.notes.sort((a, b) => a.time - b.time);
  }

  _processSchedule(
    currentTrackTime,
    endTrackTime,
    currentContextTime,
    startBoundary,
    endBoundary,
    loopLength,
    bpmRatio,
  ) {
    this.notes.forEach((note) => {
      let noteTime = note.time;

      if (noteTime > this.lastScheduledTime && noteTime <= endTrackTime) {
        const timeOffsetInTrack = noteTime - currentTrackTime;
        // Масштабируем физическое время старта ноты относительно базовой сетки
        const exactAudioContextTime =
          currentContextTime + timeOffsetInTrack / bpmRatio;
        this.onStepAction(exactAudioContextTime, note.data);
      }

      if (endTrackTime > endBoundary) {
        const projectedTime = noteTime + loopLength;
        if (
          projectedTime > this.lastScheduledTime &&
          projectedTime <= endTrackTime
        ) {
          const timeOffsetInTrack = projectedTime - currentTrackTime;
          const exactAudioContextTime =
            currentContextTime + timeOffsetInTrack / bpmRatio;
          this.onStepAction(exactAudioContextTime, note.data);
        }
      }
    });

    this.lastScheduledTime = endTrackTime;
  }
}

// ============================================================================
// ПУБЛИЧНЫЙ API КАНАЛОВ И ТЕМПА
// ============================================================================

export const createPlaybackTrack = (onStepAction) => {
  const track = new NativePlaybackTrack(onStepAction);
  activeTracks.add(track);
  return track;
};

export const clearTrackNotes = (track) => {
  if (track && typeof track.clear === 'function') track.clear();
};

export const writeNoteToTrack = (track, time, noteData) => {
  if (track && typeof track.add === 'function') track.add(time, noteData);
};

export const setTrackLoopDuration = (track, numberOfMeasures) => {
  // Фиксируем длину строго в системе координат BASE_BPM (120)
  const secondsPerMeasure = (60 / BASE_BPM) * 4;
  totalTrackDurationSeconds = numberOfMeasures * secondsPerMeasure;
  if (!isPatternLoopEnabled) loopEndSeconds = totalTrackDurationSeconds;
};

export const setEngineBpm = (bpmValue) => {
  // Меняем только коэффициент скорости, не ломая длины лупов и секундную сетку нот!
  currentBpm = bpmValue;
};

export const setPlayState = (state) => {
  const ctx = getNativeContext();

  if (state === 'start') {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!isPlaying) {
      isPlaying = true;
      lastContextTime = ctx.currentTime;
      lastScheduledDrawingTime = trackTimeSeconds - 0.001;
      lastSentStepIndex = -1;
      schedulerTimerId = setInterval(runSchedulerLoop, SCHEDULER_INTERVAL_MS);
    }
  } else if (state === 'pause') {
    isPlaying = false;
    if (schedulerTimerId) {
      clearInterval(schedulerTimerId);
      schedulerTimerId = null;
    }
  } else {
    isPlaying = false;
    if (schedulerTimerId) {
      clearInterval(schedulerTimerId);
      schedulerTimerId = null;
    }
    trackTimeSeconds = isPatternLoopEnabled ? loopStartSeconds : 0;
    lastScheduledDrawingTime = trackTimeSeconds - 0.001;
    lastSentStepIndex = -1;
    activeTracks.forEach((t) => {
      t.lastScheduledTime = trackTimeSeconds - 0.05;
    });
  }
};

export const setEnginePosition = (patternIndex) => {
  const secondsPerMeasure = (60 / BASE_BPM) * 4;
  const patternStartTimeInSeconds = patternIndex * secondsPerMeasure;
  const quantizedJumpTime = Math.max(
    0,
    patternStartTimeInSeconds - LOOKAHEAD_OFFSET_SEC,
  );
  setGlobalTransportTime(quantizedJumpTime);
};

export const setGlobalTransportTime = (seconds) => {
  trackTimeSeconds = seconds;
  lastScheduledDrawingTime = seconds - 0.001;
  lastSentStepIndex = -1;
  activeTracks.forEach((t) => {
    t.lastScheduledTime = seconds - 0.05;
  });
};

export const enableEngineLoop = (patternIndex) => {
  const secondsPerMeasure = (60 / BASE_BPM) * 4;
  loopStartSeconds = patternIndex * secondsPerMeasure;
  loopEndSeconds = (patternIndex + 1) * secondsPerMeasure;
  isPatternLoopEnabled = true;
  if (
    trackTimeSeconds < loopStartSeconds ||
    trackTimeSeconds >= loopEndSeconds
  ) {
    setGlobalTransportTime(loopStartSeconds);
  }
};

export const disableEngineLoop = () => {
  isPatternLoopEnabled = false;
};
export const enableGlobalTransportLoop = (numberOfMeasures) => {
  isPatternLoopEnabled = false;
};

// --- НАДРОДНАЯ ГРАФИКА С КОМПЕНСАЦИЕЙ ОПЕРЕЖЕНИЯ ---
export const scheduleFrame = (time, drawFunction) => {
  const ctx = getNativeContext();
  const bpmRatio = currentBpm / BASE_BPM;

  // Вычисляем точную задержку кадра с учетом текущей скорости прокрутки времени
  const delayMs = Math.max(0, ((time - trackTimeSeconds) / bpmRatio) * 1000);
  setTimeout(() => {
    requestAnimationFrame(drawFunction);
  }, delayMs);
};

export const triggerDrumVisualLevel = (drumIndex, time) => {
  scheduleFrame(time, () => {
    drumLevels[drumIndex] = 1.0;
  });
};

export const startDrawingLoop = (callback, rate) => {
  const id = Math.random().toString(36).substring(2, 9);
  nativeDrawingCallbacks.set(id, callback);
  return id;
};

export const stopDrawingLoop = (id) => {
  nativeDrawingCallbacks.delete(id);
};

// ============================================================================
// СБОРКА ЭФФЕКТОВ
// ============================================================================
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
      if (typeof hardwareStaticPanner.dispose === 'function')
        hardwareStaticPanner.dispose();
      createdEffects.forEach((node) => {
        if (node && typeof node.dispose === 'function') node.dispose();
      });
      if (rawSynth && typeof rawSynth.dispose === 'function')
        rawSynth.dispose();
    },
  };
};
