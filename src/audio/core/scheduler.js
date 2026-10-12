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
  console.log('🎛️ [AUDIO ENGINE]: Полный сброс счётчиков времени в 0');
};

export const updateHardwarePatternBounds = (count) => {
  pendingMaxPatternCount = count;
};

// 🆕 ИСПРАВЛЕННЫЙ ПРЕДОХРАНИТЕЛЬ: Принимает третьим аргументом текущий живой индекс паттерна из UI
export const updateHardwareLoopState = (
  isLooping,
  selectedPatternIndex,
  currentPlayPatternIndex,
) => {
  hardwareIsLooping = isLooping;

  if (typeof selectedPatternIndex === 'number') {
    pendingLoopPatternIndex = selectedPatternIndex;
  } else if (typeof currentPlayPatternIndex === 'number') {
    // ЗАЩИТА ОТ FALSE: Если выбранный индекс равен false, лупим тот паттерн, который играет прямо сейчас!
    pendingLoopPatternIndex = currentPlayPatternIndex;
  } else {
    pendingLoopPatternIndex = 0;
  }

  if (isLooping) {
    currentHardwarePattern = pendingLoopPatternIndex;
  }

  console.log(
    `🚨 [HOOK -> ENGINE]: Кликнули луп! Loop=${isLooping} | UI Selected=${selectedPatternIndex} | UI CurrentPlay=${currentPlayPatternIndex} -> ИТОГОВЫЙ ЖЕЛЕЗНЫЙ ЛУП ПАТТЕРНА=${pendingLoopPatternIndex}`,
  );
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

    if (stepToSchedule % 4 === 0 || hardwareIsLooping) {
      console.log(
        `🔊 [AUDIO ACTION]: Сканер Look-Ahead шлёт в звуковую карту -> [Паттерн: ${patternToSchedule} | Шаг: ${stepToSchedule}]`,
      );
    }

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

    // 3. ЛИНЕЙНЫЙ ИНКРЕМЕНТ ШАГОВ СЕКВЕНСОРА
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
    console.log('🚀 [AUDIO ENGINE]: Низкоуровневый таймер запущен!');
  },

  stopLoop() {
    if (!isTimerRunning()) return;
    clearInterval(timerId);
    timerId = null;
    draw.clear();
    resetHardwareCounters();
    console.log('🛑 [AUDIO ENGINE]: Низкоуровневый таймер остановлен.');
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
