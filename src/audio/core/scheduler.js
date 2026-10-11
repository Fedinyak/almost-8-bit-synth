import { transport } from './transport';
import { getNativeContext } from './nativeContext';

// --- НАСТРОЙКИ НИЗКОУРОВНЕВОГО ТАЙМЕРА (LOOK-AHEAD) ---
const SCHEDULER_INTERVAL_MS = 25; // Интервал просыпания таймера в миллисекундах
const LOOKAHEAD_WINDOW_SEC = 0.1; // Скользящее окно планирования (100 миллисекунд вперед)

// --- МУЗЫКАЛЬНЫЕ И СИСТЕМНЫЕ КОНСТАНТЫ СЕТКИ ---
const SIXTEENTH_NOTE_ID = '16n'; // Музыкальный маркер 16-й доли секвенсора
const SECONDS_IN_MINUTE = 60; // Константа секунд в минуте для расчета BPM
const STEPS_PER_BEAT = 4; // Количество 16-х шагов в одной четверти

// --- ЗАЩИТНЫЕ СДВИГИ ДЛЯ ПРЕДОТВРАЩЕНИЯ ПРОПУСКОВ КАДРОВ ---
const TIMELINE_RESET_OFFSET_SEC = 0.001; // Сдвиг на 1 мс назад для надежного захвата текущей доли

let timerId = null;

// Чистые скрытые коллекции внутри модуля (файла) — никакого хардкода и никаких "this"
const activeTracks = new Set();
const drawingCallbacks = new Map();

// --- ВНУТРЕННИЕ ФУНКЦИИ КОНВЕЙЕРА ВРЕМЕНИ ---

const processSingleRepeater = (
  repeater,
  currentSeconds,
  scheduleUntilTime,
  now,
) => {
  const interval =
    repeater.rate === SIXTEENTH_NOTE_ID
      ? SECONDS_IN_MINUTE / transport.bpm / STEPS_PER_BEAT
      : repeater.interval;

  let nextRepeatTime =
    Math.ceil(repeater.lastScheduledTime / interval) * interval;
  if (nextRepeatTime <= repeater.lastScheduledTime) {
    nextRepeatTime += interval;
  }

  while (nextRepeatTime <= scheduleUntilTime) {
    if (nextRepeatTime > repeater.lastScheduledTime) {
      const stepTimeCapture = nextRepeatTime;
      const timeOffset = stepTimeCapture - currentSeconds;
      const exactAudioContextTime = now + timeOffset;

      repeater.callback(exactAudioContextTime);
      repeater.lastScheduledTime = nextRepeatTime;
    }
    nextRepeatTime += interval;
  }
};

const advanceDrawing = (currentSeconds, scheduleUntilTime, now) => {
  drawingCallbacks.forEach((repeater) => {
    processSingleRepeater(repeater, currentSeconds, scheduleUntilTime, now);
  });
};

const advanceAudio = (currentSeconds, scheduleUntilTime, now) => {
  activeTracks.forEach((track) => {
    track.processSchedule(currentSeconds, scheduleUntilTime, now);
  });
};

// --- ПУБЛИЧНЫЙ API МОДУЛЯ ШЕДУЛЕРА ---
export const scheduler = {
  // Выставляем ссылку на треки наружу, чтобы ядро могло сделать сброс при стопе
  get tracks() {
    return activeTracks;
  },

  // Регистрация аудио-дорожек (Tone.Part)
  registerTrack(track) {
    activeTracks.add(track);
  },
  unregisterTrack(track) {
    activeTracks.delete(track);
  },

  // Регистрация репитеров интерфейса (Tone.Transport.scheduleRepeat)
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

  // Сброс таймлайна графики при перемотке транспорта (setGlobalTransportTime)
  resetDrawingTimeline(seconds) {
    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = seconds - TIMELINE_RESET_OFFSET_SEC;
    });
  },

  // Запуск низкоуровневого цикла часов
  startLoop() {
    if (timerId) return;

    const runSchedulerLoop = () => {
      if (!transport.isPlaying) return;

      // Делаем шаг времени транспорта
      transport.tick();

      const currentSeconds = transport.seconds;
      const scheduleUntilTime = currentSeconds + LOOKAHEAD_WINDOW_SEC;

      const ctx = getNativeContext();
      const now = ctx.currentTime;

      // Вызываем изолированные методы конвейера времени
      advanceDrawing(currentSeconds, scheduleUntilTime, now);
      advanceAudio(currentSeconds, scheduleUntilTime, now);
    };

    timerId = setInterval(runSchedulerLoop, SCHEDULER_INTERVAL_MS);
  },

  // Остановка низкоуровневого цикла часов
  stopLoop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = -TIMELINE_RESET_OFFSET_SEC;
    });
  },

  updateState(state) {
    if (state === 'start') {
      this.startLoop();
    } else if (state === 'pause') {
      this.stopLoop();
    } else {
      this.stopLoop();
      // Чистим указатели внутри шедулера, ядро об этом знать не должно!
      activeTracks.forEach((t) => {
        t.lastScheduledTime = -0.05;
      });
    }
  },

  jumpToTimeline(seconds) {
    activeTracks.forEach((t) => {
      t.lastScheduledTime = seconds - 0.05;
    });
    this.resetDrawingTimeline(seconds);
  },
};
