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

      track.patternsMap[measureIndex][stepIndexInMeasure] = {
        data: noteData,
        phaseOffset,
      };
    },

    addNoteToTick(absoluteTick, noteData, phaseOffset = 0) {
      const measureIndex = Math.floor(absoluteTick / 16);
      const stepIndexInMeasure = absoluteTick % 16;

      if (!track.patternsMap[measureIndex]) {
        track.patternsMap[measureIndex] = {};
      }

      track.patternsMap[measureIndex][stepIndexInMeasure] = {
        data: noteData,
        phaseOffset,
      };
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

      const noteCell = activeMeasure[stepIndexInPattern];
      if (!noteCell) return;

      onStepAction(exactAudioTime + noteCell.phaseOffset, noteCell.data);
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
