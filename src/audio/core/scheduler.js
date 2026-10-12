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
  nextStepAudioTime = ctx ? ctx.currentTime : 0;
  currentHardwareStep = 0;
  currentHardwarePattern = 0;
};

export const updateHardwarePatternBounds = (count) => {
  pendingMaxPatternCount = count;
};

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

  if (isLooping) {
    currentHardwarePattern = pendingLoopPatternIndex;
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

  if (nextStepAudioTime === 0) {
    nextStepAudioTime = ctx.currentTime;
  }

  while (
    isTimeWithinPlanningWindow(nextStepAudioTime, scheduleUntilAudioTime)
  ) {
    const exactAudioTime = nextStepAudioTime;

    if (hardwareIsLooping) {
      currentHardwarePattern = pendingLoopPatternIndex;
    }

    const stepToSchedule = currentHardwareStep;
    const patternToSchedule = currentHardwarePattern;

    // 1. ВЫСТРЕЛ ЗВУКА
    activeTracks.forEach((track) => {
      if (typeof track.processAudioStep === 'function') {
        track.processAudioStep(
          exactAudioTime,
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

    // 3. ЛИНЕЙНЫЙ ИНКРЕМЕНТ ШАГОВ
    if (currentHardwareStep === 15) {
      currentHardwareStep = 0;

      if (!hardwareIsLooping) {
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
