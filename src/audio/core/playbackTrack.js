import { scheduler } from './scheduler';

export function PlaybackTrack(onStepAction) {
  const track = {
    patternsMap: {},

    clear() {
      track.patternsMap = {};
      console.log(
        '🗑️ [TRACK STORAGE]: База данных нот дорожки полностью очищена.',
      );
    },

    add(musicalTimeValue, measureIndex, noteData, phaseOffset = 0) {
      if (!track.patternsMap[measureIndex]) {
        track.patternsMap[measureIndex] = {};
      }

      const parts = musicalTimeValue.split(':');
      if (parts.length !== 3) return;

      const stepIndexInMeasure = parseInt(parts[2], 10) || 0;

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
     * АППАРАТНЫЙ ВЫСТРЕЛ ЗВУКА С ЛОГАМИ ОШИБОК ДАННЫХ
     */
    processAudioStep(
      exactAudioTime,
      stepIndexInPattern,
      currentHardwarePattern,
    ) {
      const activeMeasure = track.patternsMap[currentHardwarePattern];

      // КРИТИЧЕСКИЙ ЛОГ: Проверяем, есть ли вообще данные в ячейке, которую просит шедулер
      if (!activeMeasure) {
        // Если шедулер просит играть 3-й паттерн (индекс 2), а тут пусто — пишем ошибку в консоль
        console.error(
          `❌ [TRACK STORAGE ERROR]: Шедулер требует сыграть [Паттерн: ${currentHardwarePattern}], но в памяти дорожки этого такта НЕТ ЕБАТЬ! Объект undefined.`,
        );
        return;
      }

      const noteCell = activeMeasure[stepIndexInPattern];
      if (!noteCell) return;

      // Если нота нашлась — пишем, что триггер сработал успешно
      if (noteCell.data && noteCell.data.note) {
        console.log(
          `🎯 [SOUND TRIGGER]: Физический выстрел ноты синтора/барабана -> ${noteCell.data.note} на шаге ${stepIndexInPattern} в Паттерне ${currentHardwarePattern}`,
        );
      }

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
