import { scheduler } from './scheduler';

export function PlaybackTrack(onStepAction) {
  const track = {
    // Плоская карта нот, где ключ — это сквозной абсолютный тик (шаг) ленты трекера
    ticksMap: {},

    clear() {
      track.ticksMap = {};
    },

    /**
     * Декларативное забивание ноты на жесткий музыкальный адрес
     * @param {number} absoluteTick - Сквозной индекс 16-го шага проекта (например, 32)
     */
    addNoteToTick(absoluteTick, noteData, phaseOffset = 0) {
      track.ticksMap[absoluteTick] = {
        data: noteData,
        phaseOffset,
      };
    },

    setLoopDuration(numberOfMeasures) {
      // Метод пассивен — длины тактов контролирует Playhead в scheduler.js
    },

    applyHardwareLoopEnd(count) {
      // Метод пассивен — границы отслеживаются аппаратно
    },

    /**
     * ВЫСТРЕЛ ЗВУКА: Вызывается шедулером Look-Ahead на каждом нативном музыкальном тике
     * Полная изоляция от плавающих секунд транспорта — срывы фазы времени физически уничтожены!
     */
    processAudioTick(exactAudioTime, currentAbsoluteTick) {
      const noteCell = track.ticksMap[currentAbsoluteTick];
      if (!noteCell) return; // Если в этой ячейке тика пусто — наступает идеальная тишина

      // Стреляем нотой в точную миллисекунду AudioContext
      onStepAction(exactAudioTime + noteCell.phaseOffset, noteCell.data);
    },

    processSchedule() {
      // Старая логика с секундами удалена
    },

    dispose() {
      scheduler.unregisterTrack(track);
      track.ticksMap = {};
    },
  };

  scheduler.registerTrack(track);
  return track;
}
