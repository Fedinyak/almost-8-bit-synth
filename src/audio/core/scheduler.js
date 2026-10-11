import { transport } from './transport';
import { getNativeContext } from './nativeContext';
import { musicalTime } from './musicalTime';

// --- НАСТРОЙКИ НИЗКОУРОВНЕВОГО ТАЙМЕРА (LOOK-AHEAD) ---
const SCHEDULER_INTERVAL_MS = 25; // Интервал просыпания таймера в миллисекундах
const LOOKAHEAD_WINDOW_SEC = 0.1; // Скользящее окно планирования (100 миллисекунд вперед)

// --- МУЗЫКАЛЬНЫЕ И СИСТЕМНЫЕ КОНСТАНТЫ СЕТКИ ---
const SIXTEENTH_NOTE_ID = '16n'; // Музыкальный маркер 16-й доли секвенсора

// --- ЗАЩИТНЫЕ СДВИГИ ДЛЯ ПРЕДОТВРАЩЕНИЯ ПРОПУСКОВ КАДРОВ ---
const TIMELINE_RESET_OFFSET_SEC = 0.001; // Сдвиг на 1 мс назад для надежного захвата текущей доли
const TRACK_RESET_OFFSET_SEC = -0.05; // Сдвиг по умолчанию для сброса аудио-дорожек

let timerId = null;

// Чистые скрытые коллекции внутри модуля (файла) — никакого хардкода и никаких "this"
const activeTracks = new Set();
const drawingCallbacks = new Map();

// --- ВНУТРЕННИЕ ФУНКЦИИ КОНВЕЙЕРА ВРЕМЕНИ ---

const advanceDrawing = (currentSeconds, scheduleUntilTime, now) => {
  drawingCallbacks.forEach((repeater) => {
    // Вся тяжелая логика и циклы репитера теперь ушли в модуль времени
    musicalTime.advanceRepeaterLoop(
      repeater,
      currentSeconds,
      scheduleUntilTime,
      now,
    );
  });
};

const advanceAudio = (currentSeconds, scheduleUntilTime, now) => {
  activeTracks.forEach((track) => {
    track.processSchedule(currentSeconds, scheduleUntilTime, now);
  });
};

// Проверка: запущен ли сейчас низкоуровневый таймер
const isTimerRunning = () => timerId !== null;

// Выполнение шага времени транспорта и запуск очередей планирования
const executeSchedulerTick = () => {
  if (!transport.isPlaying) return;

  transport.tick();

  const currentSeconds = transport.seconds;
  const scheduleUntilTime = currentSeconds + LOOKAHEAD_WINDOW_SEC;

  const ctx = getNativeContext();
  const now = ctx.currentTime;

  advanceDrawing(currentSeconds, scheduleUntilTime, now);
  advanceAudio(currentSeconds, scheduleUntilTime, now);
};

// --- ПУБЛИЧНЫЙ API МОДУЛЯ ШЕДУЛЕРА ---
export const scheduler = {
  // Выставляем ссылку на треки наружу через обычный метод
  getActiveTracks() {
    return activeTracks;
  },

  // Регистрация аудио-дорожек
  registerTrack(track) {
    activeTracks.add(track);
  },
  unregisterTrack(track) {
    activeTracks.delete(track);
  },

  // Регистрация репитеров интерфейса
  registerDrawingLoop(id, callback, intervalInSeconds) {
    drawingCallbacks.set(id, {
      callback,
      interval: intervalInSeconds,
      rate: SIXTEENTH_NOTE_ID,
      lastScheduledTime: transport.seconds - TIMELINE_RESET_OFFSET_SEC,
    });
  },

  unregisterDrawingLoop(id) {
    drawingCallbacks.delete(id);
  },

  // Сброс таймлайна графики при перемотке транспорта
  resetDrawingTimeline(seconds) {
    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = seconds - TIMELINE_RESET_OFFSET_SEC;
    });
  },

  // Запуск низкоуровневого цикла часов
  startLoop() {
    if (isTimerRunning()) return;
    timerId = setInterval(executeSchedulerTick, SCHEDULER_INTERVAL_MS);
  },

  // Остановка низкоуровневого цикла часов
  stopLoop() {
    if (!isTimerRunning()) return;

    clearInterval(timerId);
    timerId = null;

    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = -TIMELINE_RESET_OFFSET_SEC;
    });
  },

  updateState(state) {
    switch (state) {
      case 'start':
        scheduler.startLoop();
        break;

      case 'pause':
        scheduler.stopLoop();
        break;

      default:
        scheduler.stopLoop();
        activeTracks.forEach((track) => {
          track.lastScheduledTime = TRACK_RESET_OFFSET_SEC;
        });
        break;
    }
  },

  jumpToTimeline(seconds) {
    activeTracks.forEach((track) => {
      track.lastScheduledTime = seconds - TRACK_RESET_OFFSET_SEC;
    });
    scheduler.resetDrawingTimeline(seconds);
  },
};
