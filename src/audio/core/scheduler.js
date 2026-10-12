import { transport } from './transport';
import { getNativeContext } from './nativeContext';
import { draw } from './draw';
import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';

// --- НАСТРОЙКИ НИЗКОУРОВНЕВОГО ТАЙМЕРА ---
const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_WINDOW_SEC = 0.1;
const SIXTEENTH_NOTE_ID = '16n';

let timerId = null;

// Опорное время AudioContext для следующего запланированного тика
let nextTickAudioTime = 0;

// --- КВАНТОВЫЕ БУФЕРЫ ИЗ UI ---
let maxPatternCount = SEQUENCER_CONFIG.DEFAULT_PATTERN_COUNT || 3;
let hardwareIsLooping = false;
let pendingLoopPatternIndex = 0;

const activeTracks = new Set();
const drawingCallbacks = new Map();

export const updateHardwarePatternBounds = (count) => {
  maxPatternCount = count;
};

export const updateHardwareLoopState = (isLooping, selectedPatternIndex) => {
  hardwareIsLooping = isLooping;
  if (typeof selectedPatternIndex === 'number') {
    pendingLoopPatternIndex = selectedPatternIndex;
  }
};

export const getHardwareLoopState = () => ({
  isLooping: hardwareIsLooping,
  loopPatternIndex: pendingLoopPatternIndex,
});

// Главный Look-Ahead сканер музыкальной ленты шагов
const processTimelineScheduling = (scheduleUntilAudioTime) => {
  const ctx = getNativeContext();
  if (!ctx) return;

  if (nextTickAudioTime === 0) {
    nextTickAudioTime = ctx.currentTime;
  }

  // Пока время следующей ноты в будущем попадает в наше скользящее 100 мс окно
  while (nextTickAudioTime < scheduleUntilAudioTime) {
    const exactAudioTime = nextTickAudioTime;

    // Получаем текущие координаты из Playhead
    const currentAbsoluteTick = transport.ticks;
    const stepInPattern = currentAbsoluteTick % 16;
    const patternIndex = Math.floor(currentAbsoluteTick / 16);

    // 1. СИНХРОННЫЙ АППАРАТНЫЙ ВЫСТРЕЛ ЗВУКА: Передаем дорожкам сквозной тик
    activeTracks.forEach((track) => {
      if (typeof track.processAudioTick === 'function') {
        track.processAudioTick(exactAudioTime, currentAbsoluteTick);
      }
    });

    // 2. ПЛАНИРОВАНИЕ КАДРА ГРАФИКИ В UI (Строго 1 раз за шаг)
    draw.schedule(exactAudioTime, () => {
      drawingCallbacks.forEach((repeater) => {
        if (typeof repeater.callback === 'function') {
          repeater.callback(exactAudioTime, stepInPattern, patternIndex);
        }
      });
    });

    // 3. АППАРАТНОЕ КВАНТОВАНИЕ И ДВИЖЕНИЕ PLAYHEAD КУРСОРA
    if (stepInPattern === 15) {
      // На границе такта проверяем локальный луп паттерна
      if (hardwareIsLooping) {
        transport.ticks = pendingLoopPatternIndex * 16; // Замыкаем Playhead в петлю
      } else {
        const nextPattern = patternIndex + 1;
        if (nextPattern >= maxPatternCount) {
          transport.ticks = 0; // Бесшовный сброс всей цепочки в ноль
        } else {
          transport.ticks = nextPattern * 16;
        }
      }
    } else {
      transport.ticks = currentAbsoluteTick + 1; // Просто шагаем Playhead вперед
    }

    // Сдвигаем физический временной указатель ноты на точную длительность одного 16-го шага
    nextTickAudioTime += transport.getSecondsPerTick();
  }
};

const isTimerRunning = () => timerId !== null;

const executeSchedulerTick = () => {
  if (!transport.isPlaying) return;

  const ctx = getNativeContext();
  if (!ctx) return;

  // Сканируем музыкальную ленту на 100 миллисекунд вперед
  processTimelineScheduling(ctx.currentTime + LOOKAHEAD_WINDOW_SEC);
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

  resetDrawingTimeline() {
    draw.clear();
    const ctx = getNativeContext();
    nextTickAudioTime = ctx ? ctx.currentTime : 0;
  },

  startLoop() {
    if (isTimerRunning()) return;
    scheduler.resetDrawingTimeline();
    timerId = setInterval(executeSchedulerTick, SCHEDULER_INTERVAL_MS);
  },

  stopLoop() {
    if (!isTimerRunning()) return;
    clearInterval(timerId);
    timerId = null;
    draw.clear();
    nextTickAudioTime = 0;
  },

  updateState(state) {
    if (state === 'start') scheduler.startLoop();
    else if (state === 'pause') scheduler.stopLoop();
    else {
      scheduler.stopLoop();
      transport.ticks = 0; // Сбрасываем Playhead при Стопе
    }
  },

  jumpToTimeline(seconds) {
    scheduler.resetDrawingTimeline();
  },
};
