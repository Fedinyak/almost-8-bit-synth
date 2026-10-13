import { transport } from './transport';
import { getNativeContext } from './nativeContext';
import { draw } from './draw';
import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';

const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_WINDOW_SEC = 0.1;
const SIXTEENTH_NOTE_ID = '16n';

let timerId = null;
let nextStepAudioTime = 0;

let currentHardwareStep = 0;
let currentHardwarePattern = 0;

let pendingMaxPatternCount = SEQUENCER_CONFIG.DEFAULT_PATTERN_COUNT || 3;
let hardwareIsLooping = false;
let pendingLoopPatternIndex = 0;

const activeTracks = new Set();
const drawingCallbacks = new Map();

export const resetHardwareCounters = () => {
  const ctx = getNativeContext();
  if (ctx) {
    const secondsPerMeasure = transport.getSecondsPerMeasure();
    const secondsPerStep = secondsPerMeasure / 16;
    // Инициализируем стартовое время с точным сдвигом на один шаг вперед,
    // чтобы дать Look-Ahead планировщику запас времени на обработку первого события
    nextStepAudioTime = ctx.currentTime + secondsPerStep;
  } else {
    nextStepAudioTime = 0;
  }
  currentHardwareStep = 0;
  currentHardwarePattern = 0;
};

export const updateHardwarePatternBounds = (count) => {
  pendingMaxPatternCount = count;
};

// БЕЗОПАСНАЯ ЗАПИСЬ: Сохраняем намерения интерфейса только в буферные переменные.
// Аудио-поток применит их строго на границе такта (квантованно).
export const updateHardwareLoopState = (
  isLooping,
  selectedPatternIndex,
  currentPlayPatternIndex,
) => {
  hardwareIsLooping = isLooping;

  if (typeof selectedPatternIndex === 'number') {
    pendingLoopPatternIndex = selectedPatternIndex;
  } else if (typeof currentPlayPatternIndex === 'number') {
    pendingLoopPatternIndex = currentPlayPatternIndex;
  } else {
    pendingLoopPatternIndex = 0;
  }
};

export const getHardwareLoopState = () => ({
  isLooping: hardwareIsLooping,
  loopPatternIndex: pendingLoopPatternIndex,
});

const isTimeWithinPlanningWindow = (time, scheduleUntilTime) =>
  time < scheduleUntilTime;

const processHybridScheduling = (scheduleUntilAudioTime) => {
  const ctx = getNativeContext();
  if (!ctx) return;

  const secondsPerMeasure = transport.getSecondsPerMeasure();
  const secondsPerStep = secondsPerMeasure / 16;

  if (nextStepAudioTime < ctx.currentTime) {
    nextStepAudioTime = ctx.currentTime + secondsPerStep;
  }

  while (
    isTimeWithinPlanningWindow(nextStepAudioTime, scheduleUntilAudioTime)
  ) {
    const exactAudioTime = nextStepAudioTime;
    const stepToSchedule = currentHardwareStep;
    const patternToSchedule = currentHardwarePattern;

    const safeAudioTime = Math.max(exactAudioTime, ctx.currentTime);

    // 1. ВЫСТРЕЛ ЗВУКА
    activeTracks.forEach((track) => {
      if (typeof track.processAudioStep === 'function') {
        track.processAudioStep(
          safeAudioTime,
          stepToSchedule,
          patternToSchedule,
        );
      }
    });

    // 2. ОТРИСОВКА ИНТЕРФЕЙСА
    draw.schedule(exactAudioTime, () => {
      drawingCallbacks.forEach((repeater) => {
        if (typeof repeater.callback === 'function') {
          repeater.callback(exactAudioTime, stepToSchedule, patternToSchedule);
        }
      });
    });

    // 3. МАТЕМАТИЧЕСКИ ИДЕАЛЬНЫЙ ИНКРЕМЕНТ ШАГОВ И КВАНТОВАНИЕ ЛУПОВ
    if (currentHardwareStep === 15) {
      currentHardwareStep = 0;

      if (hardwareIsLooping) {
        // Квантованный переход на залупанный паттерн происходит строго по окончании 15-го шага
        currentHardwarePattern = pendingLoopPatternIndex;
      } else {
        const nextPatternCandidate = currentHardwarePattern + 1;
        if (nextPatternCandidate >= pendingMaxPatternCount) {
          currentHardwarePattern = 0;
        } else {
          currentHardwarePattern = nextPatternCandidate;
        }
      }
    } else {
      currentHardwareStep++;
    }

    nextStepAudioTime += secondsPerStep;
  }
};

const isTimerRunning = () => timerId !== null;

const executeSchedulerTick = () => {
  if (!transport.isPlaying) return;
  const ctx = getNativeContext();
  if (!ctx) return;

  processHybridScheduling(ctx.currentTime + LOOKAHEAD_WINDOW_SEC);
};

export const scheduler = {
  getActiveTracks() {
    return activeTracks;
  },
  registerTrack(track) {
    activeTracks.add(track);
  },
  unregisterTrack(track) {
    activeTracks.delete(track);
  },

  registerDrawingLoop(id, callback, intervalInSeconds) {
    drawingCallbacks.set(id, {
      callback,
      interval: intervalInSeconds,
      rate: SIXTEENTH_NOTE_ID,
    });
  },
  unregisterDrawingLoop(id) {
    drawingCallbacks.delete(id);
  },

  resetDrawingTimeline(seconds) {
    draw.clear();
    resetHardwareCounters();
  },

  startLoop() {
    if (isTimerRunning()) return;

    resetHardwareCounters();

    timerId = setInterval(executeSchedulerTick, SCHEDULER_INTERVAL_MS);
  },

  stopLoop() {
    if (!isTimerRunning()) return;
    clearInterval(timerId);
    timerId = null;
    draw.clear();
    resetHardwareCounters();
  },

  updateState(state) {
    if (state === 'start') scheduler.startLoop();
    else if (state === 'pause') scheduler.stopLoop();
    else scheduler.stopLoop();
  },

  jumpToTimeline(seconds) {
    scheduler.resetDrawingTimeline(seconds);
  },
};
