import { getNativeContext } from './nativeContext';

export const draw = {
  // Аналог Tone.Draw.schedule(callback, time)
  schedule(time, drawFunction) {
    const ctx = getNativeContext();
    const now = ctx.currentTime;

    // Вычисляем задержку кадра относительно реального времени аудиокарты
    const delayMs = Math.max(0, (time - now) * 1000);

    setTimeout(() => {
      requestAnimationFrame(drawFunction);
    }, delayMs);
  },
};
