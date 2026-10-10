import { LOOKAHEAD_OFFSET_SEC } from '../../constants/constants';
import { drumLevels } from '../sync/visualizerState';

// Импортируем декомпозированные чистые модули времени, таймеров и отрисовки
import { transport } from './transport';
import { scheduler } from './scheduler';
import { draw } from './draw';

// Реэкспортируем конвейер сборки эффектов для фабрик синтов и драм-машины
export { wrapInstrumentWithEffects } from './effectsRack';

// Источник правды живого темпа для утилит тайминга
export const getCurrentEngineBpm = () => transport.bpm;

// ============================================================================
// ЦЕНТРАЛЬНЫЙ ПУЛЬТ УПРАВЛЕНИЯ ПЛЕЕРОМ (API ТРАНСПОРТА)
// ============================================================================

export const setEngineBpm = (bpmValue) => {
  console.log(
    `[ENGINE DIAG]: ⚡️ Изменение BPM. Старый: ${transport.bpm}, Новый: ${bpmValue}`,
  );
  transport.bpm = bpmValue;
};

export const setPlayState = (state) => {
  console.log(
    `[ENGINE DIAG]: 🎛 Смена состояния плеера на: "${state}". Текущий BPM: ${transport.bpm}`,
  );

  if (state === 'start') {
    transport.start();
    scheduler.startLoop();
  } else if (state === 'pause') {
    transport.pause();
    scheduler.stopLoop();
  } else {
    transport.stop();
    scheduler.stopLoop();

    if (scheduler.activeTracks) {
      scheduler.activeTracks.forEach((t) => {
        t.lastScheduledTime = -0.05;
      });
    }
  }
};

export const setEnginePosition = (patternIndex) => {
  const secondsPerMeasure = (60 / transport.bpm) * 4;
  const patternStartTimeInSeconds = patternIndex * secondsPerMeasure;
  const quantizedJumpTime = Math.max(
    0,
    patternStartTimeInSeconds - LOOKAHEAD_OFFSET_SEC,
  );
  setGlobalTransportTime(quantizedJumpTime);
};

export const setGlobalTransportTime = (seconds) => {
  console.log(
    `[ENGINE DIAG]: 📍 Перемотка транспорта на отметку: ${seconds.toFixed(3)}s`,
  );
  transport.seconds = seconds;

  if (scheduler.activeTracks) {
    scheduler.activeTracks.forEach((t) => {
      t.lastScheduledTime = seconds - 0.05;
    });
  }

  scheduler.resetDrawingTimeline(seconds);
};

// Заглушки оригинального API для совместимости с внешними файлами настроек
export const enableEngineLoop = (patternIndex) => {};
export const disableEngineLoop = () => {};
export const enableGlobalTransportLoop = (numberOfMeasures) => {};

// --- СИНХРОНИЗАЦИЯ СДВИГА И ОПЕРЕЖЕНИЯ ГРАФИКИ ---
export const scheduleFrame = (time, drawFunction) => {
  draw.schedule(time, drawFunction);
};

export const triggerDrumVisualLevel = (drumIndex, time) => {
  scheduleFrame(time, () => {
    drumLevels[drumIndex] = 1.0;
  });
};

// --- ФИКС СОВМЕСТИМОСТИ: Возвращаем прокси-методы для внешних хуков ---
export const startDrawingLoop = (callback, rate) => {
  return scheduler.registerDrawingLoop(callback, rate);
};

export const stopDrawingLoop = (id) => {
  scheduler.unregisterDrawingLoop(id);
};
