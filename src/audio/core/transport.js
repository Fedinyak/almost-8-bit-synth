import { getNativeContext } from './nativeContext';

// --- ВНУТРЕННИЙ СТЕЙТ МУЗЫКАЛЬНЫХ ЧАСОВ ---
let isPlaying = false;
let transportSeconds = 0;
let lastContextTime = 0;
let currentBpm = 120;

// Ссылка на запущенный низкоуровневый таймер
let timerId = null;

export const transport = {
  // Геттер для получения живого BPM (замена Tone.Transport.bpm.value)
  get bpm() {
    return currentBpm;
  },
  // Сеттер для изменения BPM на лету
  set bpm(value) {
    currentBpm = value;
  },

  // Геттер текущей позиции транспорта в секундах
  get seconds() {
    return transportSeconds;
  },
  set seconds(value) {
    transportSeconds = value;
  },

  // Проверка статуса воспроизведения
  get isPlaying() {
    return isPlaying;
  },

  // Метод СТАРТА транспорта
  start() {
    const ctx = getNativeContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!isPlaying) {
      isPlaying = true;
      lastContextTime = ctx.currentTime;
    }
  },

  // Метод ПАУЗЫ транспорта
  pause() {
    isPlaying = false;
  },

  // Метод ПОЛНОЙ ОСТАНОВКИ и сброса времени в ноль
  stop() {
    isPlaying = false;
    transportSeconds = 0;
  },

  // Внутренний метод инкремента времени (вызывается только шедулером на каждом тике)
  tick() {
    if (!isPlaying) return 0;

    const ctx = getNativeContext();
    const now = ctx.currentTime;
    const delta = now - lastContextTime;
    lastContextTime = now;

    // Время транспорта идет вперед
    transportSeconds += delta;
    return delta;
  },

  // Сохраняем ссылки на запущенный интервал, чтобы шедулер мог им управлять
  setTimerId(id) {
    timerId = id;
  },
  getTimerId() {
    return timerId;
  },

  setPlayState(state) {
    if (state === 'start') this.start();
    else if (state === 'pause') this.pause();
    else this.stop();
  },
};
