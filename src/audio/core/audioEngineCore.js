import { LOOKAHEAD_OFFSET_SEC } from '../../constants/constants';
import { drumLevels } from '../sync/visualizerState';

// Импортируем декомпозированные чистые подсистемы
import { transport } from './transport';
import { scheduler } from './scheduler';
import { draw } from './draw';
import { musicalTime } from './musicalTime';

// Реэкспортируем конвейер сборки эффектов для фабрик синтов и драм-машины
export { wrapInstrumentWithEffects } from './effectsRack';

// Источник правды живого темпа для утилит тайминга
export const getCurrentEngineBpm = () => transport.bpm;

// ============================================================================
// ЦЕНТРАЛЬНЫЙ ПУЛЬТ УПРАВЛЕНИЯ ПЛЕЕРОМ (ГЛОБАЛЬНЫЙ ТРАНСПОРТ)
// ============================================================================

export const setEngineBpm = (bpmValue) => {
  transport.bpm = bpmValue;
};

export const setPlayState = (state) => {
  // 1. Декларативно отдаем команду модулю времени
  transport.setPlayState(state);

  // 2. Декларативно переключаем внутреннее состояние планировщика
  scheduler.updateState(state);
};

export const setEnginePosition = (patternIndex) => {
  const patternStartTimeInSeconds = musicalTime.measuresToSeconds(patternIndex);
  const quantizedJumpTime = Math.max(
    0,
    patternStartTimeInSeconds - LOOKAHEAD_OFFSET_SEC,
  );
  setGlobalTransportTime(quantizedJumpTime);
};

export const setGlobalTransportTime = (seconds) => {
  transport.seconds = seconds;

  // Планировщик сам знает, как сдвинуть таймлайн у себя и у всех своих треков
  scheduler.jumpToTimeline(seconds);
};

// --- СИНХРОНИЗАЦИЯ СДВИГА И ОПЕРЕЖЕНИЯ ГРАФИКИ ---
export const scheduleFrame = (time, drawFunction) => {
  draw.schedule(time, drawFunction);
};

export const triggerDrumVisualLevel = (drumIndex, time) => {
  scheduleFrame(time, () => {
    drumLevels[drumIndex] = 1.0;
  });
};

// --- СОВМЕСТИМОСТЬ: Официальные прокси-методы для внешнего хука useSequencerScheduler ---
export const startDrawingLoop = (callback, rate) => {
  const id = Math.random().toString(36).substring(2, 9);
  const intervalInSeconds = musicalTime.noteToSeconds(rate);

  scheduler.registerDrawingLoop(id, callback, intervalInSeconds);
  return id;
};

export const stopDrawingLoop = (id) => {
  scheduler.unregisterDrawingLoop(id);
};

// Заглушки оригинального API для обратной совместимости, если где-то вызываются в конфигах
export const enableEngineLoop = (patternIndex) => {};
export const disableEngineLoop = () => {};
export const enableGlobalTransportLoop = (numberOfMeasures) => {};
