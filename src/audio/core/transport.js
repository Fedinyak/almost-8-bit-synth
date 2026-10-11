import { getNativeContext } from './nativeContext';

// --- ВНУТРЕННИЙ СТЕЙТ МУЗЫКАЛЬНЫХ ЧАСОВ ---
let isPlaying = false;
let transportSeconds = 0;
let lastContextTime = 0;
let currentBpm = 120;

// Ссылка на запущенный низкоуровневый таймер (возвращена для совместимости с внешним шедулером)
let timerId = null;

// --- ЛОКАЛЬНЫЕ ЧИСТЫЕ ФУНКЦИИ ОБРАБОТКИ (ПОВЕДЕНИЕ) ---

const startTransport = () => {
  const ctx = getNativeContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  if (!isPlaying) {
    isPlaying = true;
    lastContextTime = ctx.currentTime;
  }
};

const pauseTransport = () => {
  isPlaying = false;
};

const stopTransport = () => {
  isPlaying = false;
  transportSeconds = 0;
};

const executeTick = () => {
  if (!isPlaying) return 0;

  const ctx = getNativeContext();
  const now = ctx.currentTime;
  const delta = now - lastContextTime;
  lastContextTime = now;

  transportSeconds += delta;
  return delta;
};

const updatePlayState = (state) => {
  switch (state) {
    case 'start':
      startTransport();
      break;
    case 'pause':
      pauseTransport();
      break;
    default:
      stopTransport();
      break;
  }
};

// --- ПУБЛИЧНЫЙ API МОДУЛЯ ШЕДУЛЕРА ---
export const transport = {
  // Адаптеры-геттеры для полной совместимости с внешними файлами без использования "this"
  get bpm() {
    return currentBpm;
  },
  set bpm(value) {
    currentBpm = value;
  },

  get seconds() {
    return transportSeconds;
  },
  set seconds(value) {
    transportSeconds = value;
  },

  get isPlaying() {
    return isPlaying;
  },

  start() {
    startTransport();
  },

  pause() {
    pauseTransport();
  },

  stop() {
    stopTransport();
  },

  tick() {
    return executeTick();
  },

  // Сохраняем ссылки на запущенный интервал для внешнего шедулера
  setTimerId(id) {
    timerId = id;
  },
  getTimerId() {
    return timerId;
  },

  setPlayState(state) {
    updatePlayState(state);
  },
};
