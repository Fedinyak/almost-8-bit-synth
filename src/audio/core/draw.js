import { getNativeContext } from './nativeContext';
import { drumLevels } from '../sync/visualizerState';
import { scheduler } from './scheduler';

// Высокоточная скрытая очередь запланированных кадров
const drawingQueue = new Set();
let isAnimationLoopActive = false;

// Единый монолитный цикл отрисовки, который крутится на requestAnimationFrame
const runVisualSyncLoop = () => {
  if (drawingQueue.size === 0) {
    isAnimationLoopActive = false;
    return;
  }

  const ctx = getNativeContext();
  const now = ctx.currentTime;

  drawingQueue.forEach((task) => {
    // Кадр стреляет в React строго в ту миллисекунду, когда часы аудио-карты сравнялись с временем ноты
    if (now >= task.time) {
      task.callback();
      drawingQueue.delete(task); // Выполнили — удалили
    }
  });

  requestAnimationFrame(runVisualSyncLoop);
};

export const draw = {
  /**
   * Честный аналог Tone.Draw.schedule без таймаутов: пушит задачу в массив
   */
  schedule(time, drawFunction) {
    drawingQueue.add({ time, callback: drawFunction });

    // Ленивый запуск цикла, если он спал
    if (!isAnimationLoopActive) {
      isAnimationLoopActive = true;
      requestAnimationFrame(runVisualSyncLoop);
    }
  },

  /**
   * Сброс всех кадров при остановке плеера
   */
  clear() {
    drawingQueue.clear();
    isAnimationLoopActive = false;
  },
};

// --- СИСТЕМНЫЕ МЕТОДЫ СОВМЕСТИМОСТИ С ИНТЕРФЕЙСОМ ---

export const scheduleFrame = (time, drawFunction) => {
  draw.schedule(time, drawFunction);
};

export const triggerDrumVisualLevel = (drumIndex, time) => {
  draw.schedule(time, () => {
    drumLevels[drumIndex] = 1.0;
  });
};

export const startDrawingLoop = (callback, rate) => {
  const generatedId = Math.random().toString(36).substring(2, 9);
  scheduler.registerDrawingLoop(generatedId, callback, rate);
  return generatedId;
};

export const stopDrawingLoop = (id) => {
  scheduler.unregisterDrawingLoop(id);
};
