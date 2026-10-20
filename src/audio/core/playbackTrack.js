import { scheduler } from './scheduler';

export function PlaybackTrack(onStepAction) {
  const track = {
    patternsMap: {},

    clear() {
      track.patternsMap = {};
    },

    add(musicalTimeValue, measureIndex, noteData, phaseOffset = 0) {
      if (!track.patternsMap[measureIndex]) {
        track.patternsMap[measureIndex] = {};
      }

      const parts = musicalTimeValue.split(':');
      if (parts.length !== 3) return;

      const stepIndexInMeasure = parseInt(parts, 10) || 0;

      // Инициализируем массив для шага, если его нет, чтобы избежать затирания данных
      if (!track.patternsMap[measureIndex][stepIndexInMeasure]) {
        track.patternsMap[measureIndex][stepIndexInMeasure] = [];
      }

      track.patternsMap[measureIndex][stepIndexInMeasure].push({
        data: noteData,
        phaseOffset,
      });
    },

    addNoteToTick(absoluteTick, noteData, phaseOffset = 0) {
      const measureIndex = Math.floor(absoluteTick / 16);
      const stepIndexInMeasure = absoluteTick % 16;

      if (!track.patternsMap[measureIndex]) {
        track.patternsMap[measureIndex] = {};
      }

      // Инициализируем массив для шага, если его нет, чтобы избежать затирания данных
      if (!track.patternsMap[measureIndex][stepIndexInMeasure]) {
        track.patternsMap[measureIndex][stepIndexInMeasure] = [];
      }

      track.patternsMap[measureIndex][stepIndexInMeasure].push({
        data: noteData,
        phaseOffset,
      });
    },

    setLoopDuration(numberOfMeasures) {},
    applyHardwareLoopEnd(count) {},

    /**
     * АППАРАТНЫЙ ВЫСТРЕЛ ЗВУКА: Возвращает легальную тишину, если такт временно пуст в момент создания
     */
    processAudioStep(
      exactAudioTime,
      stepIndexInPattern,
      currentHardwarePattern,
    ) {
      const activeMeasure = track.patternsMap[currentHardwarePattern];
      if (!activeMeasure) return; // Пропускаем пустые такты без спама ошибками в консоль

      const cellData = activeMeasure[stepIndexInPattern];
      if (!cellData) return;

      // Если в ячейке массив (полифония / одновременные барабаны), итерируемся по нему
      if (Array.isArray(cellData)) {
        for (let i = 0; i < cellData.length; i++) {
          const noteCell = cellData[i];
          onStepAction(exactAudioTime + noteCell.phaseOffset, noteCell.data);
        }
      } else {
        // Защитный фоллбэк на случай, если где-то в памяти остался старый одиночный объект
        onStepAction(exactAudioTime + cellData.phaseOffset, cellData.data);
      }
    },

    processSchedule() {},

    dispose() {
      scheduler.unregisterTrack(track);
      track.patternsMap = {};
    },
  };

  scheduler.registerTrack(track);
  return track;
}
