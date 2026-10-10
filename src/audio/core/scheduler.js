import { transport } from './transport';
import { getNativeContext } from './nativeContext';

const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_WINDOW_SEC = 0.1;

let timerId = null;
const activeTracks = new Set();
const drawingCallbacks = new Map();

export const scheduler = {
  // Доступ к активным дорожкам для внешних манипуляций ядра
  get activeTracks() {
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
  registerDrawingLoop(callback, rate) {
    const id = Math.random().toString(36).substring(2, 9);

    // Переводим стандартные шестнадцатые доли "16n" в секунды на основе живого BPM
    let intervalInSeconds = 0.125;
    if (rate === '16n') {
      intervalInSeconds = 60 / transport.bpm / 4;
    } else if (typeof rate === 'number') {
      intervalInSeconds = rate;
    }

    drawingCallbacks.set(id, {
      callback,
      interval: intervalInSeconds,
      rate, // сохраняем для возможного пересчета
      lastScheduledTime: transport.seconds - 0.001,
    });

    return id;
  },

  unregisterDrawingLoop(id) {
    drawingCallbacks.delete(id);
  },

  // Сброс таймлайна графики при перемотке транспорта (setGlobalTransportTime)
  resetDrawingTimeline(seconds) {
    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = seconds - 0.001;
    });
  },

  // Запуск низкоуровневого цикла часов
  startLoop() {
    if (timerId) return;

    const runSchedulerLoop = () => {
      if (!transport.isPlaying) return;

      // Делаем шаг времени транспорта и получаем дельту
      const delta = transport.tick();
      const currentSeconds = transport.seconds;
      const scheduleUntilTime = currentSeconds + LOOKAHEAD_WINDOW_SEC;

      const ctx = getNativeContext();
      const now = ctx.currentTime;

      // 1. Планируем графику для интерфейса
      drawingCallbacks.forEach((repeater) => {
        // Динамически пересчитываем интервал от живого BPM прямо на лету во время прокрутки
        const interval =
          repeater.rate === '16n' ? 60 / transport.bpm / 4 : repeater.interval;

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

            // Отдаем точное время в коллбэк интерфейса
            repeater.callback(exactAudioContextTime);
            repeater.lastScheduledTime = nextRepeatTime;
          }
          nextRepeatTime += interval;
        }
      });

      // 2. Планируем звук для дорожек нот
      activeTracks.forEach((track) => {
        track.processSchedule(currentSeconds, scheduleUntilTime, now);
      });
    };

    timerId = setInterval(runSchedulerLoop, SCHEDULER_INTERVAL_MS);
  },

  // Остановка низкоуровневого цикла часов
  stopLoop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    // Сбрасываем внутренние указатели времени репитеров графики
    drawingCallbacks.forEach((repeater) => {
      repeater.lastScheduledTime = -0.001;
    });
  },
};
