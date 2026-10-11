import { getNativeContext } from './nativeContext';

// --- МАТЕМАТИЧЕСКИЕ КОНСТАНТЫ СИСТЕМЫ ВРЕМЕНИ ---
const SECONDS_TO_MS_COEFFICIENT = 1000; // Коэффициент перевода секунд в миллисекунды
const MINIMUM_DELAY_THRESHOLD_MS = 0; // Минимальный порог задержки для предотвращения отрицательных чисел

export const draw = {
  /**
   * Планирование отрисовки кадра интерфейса (Аналог Tone.Draw.schedule)
   * @param {number} time - Абсолютное целевое время AudioContext в секундах
   * @param {function} drawFunction - Коллбэк отрисовки шага/уровня в интерфейсе
   */
  schedule(time, drawFunction) {
    const ctx = getNativeContext();
    const now = ctx.currentTime;

    // Вычисляем физическую задержку кадра в миллисекундах
    const rawDelayMs = (time - now) * SECONDS_TO_MS_COEFFICIENT;
    const safeDelayMs = Math.max(MINIMUM_DELAY_THRESHOLD_MS, rawDelayMs);

    setTimeout(() => {
      requestAnimationFrame(drawFunction);
    }, safeDelayMs);
  },
};
