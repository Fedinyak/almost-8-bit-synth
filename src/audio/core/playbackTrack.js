import { scheduler } from './scheduler';
import { musicalTime } from './musicalTime';
import {
  isTrackNotesEmpty,
  shouldNoteBeScheduled,
  triggerAudioEvent,
  commitLastScheduledTime,
} from './schedulerUtils';

// --- СИСТЕМНЫЕ КОНСТАНТЫ ПЛАНИРОВАНИЯ И ТАЙМЛАЙНОВ ---
const SCHEDULER_BUFFER_OFFSET_SEC = -0.05; // Стартовое отрицательное смещение для захвата нот на нулевой отметке
const DEFAULT_LOOP_DURATION_SEC = 4.0; // Длительность лупа дорожки по умолчанию в секундах

export function PlaybackTrack(onStepAction) {
  const track = {
    notes: [],
    lastScheduledTime: SCHEDULER_BUFFER_OFFSET_SEC,
    loopEnd: DEFAULT_LOOP_DURATION_SEC,

    // Мгновенная безопасная очистка таймлайна дорожки
    clear() {
      track.notes = [];
      track.lastScheduledTime = SCHEDULER_BUFFER_OFFSET_SEC;
    },

    // Хронологическое добавление музыкального события в массив
    add(timeInSeconds, noteData) {
      track.notes = [
        ...track.notes,
        { time: timeInSeconds, data: noteData },
      ].sort((a, b) => a.time - b.time);
    },

    // Изменение длины циклического лупа дорожки на основе музыкальных тактов
    setLoopDuration(numberOfMeasures) {
      track.loopEnd = musicalTime.measuresToSeconds(numberOfMeasures);
    },

    // Проход Look-Ahead планировщика по нотам (вызывается из scheduler.js)
    processSchedule(
      currentTransportTime,
      endTransportTime,
      currentContextTime,
    ) {
      if (isTrackNotesEmpty(track.notes)) return;

      track.notes.forEach((note) => {
        if (
          shouldNoteBeScheduled(
            note,
            track,
            currentTransportTime,
            endTransportTime,
          )
        ) {
          triggerAudioEvent(
            note,
            track,
            onStepAction,
            currentTransportTime,
            currentContextTime,
          );
        }
      });

      commitLastScheduledTime(track, endTransportTime);
    },

    // Полная деструктуризация дорожки для исключения утечек памяти
    dispose() {
      scheduler.unregisterTrack(track);
      track.notes = [];
    },
  };

  scheduler.registerTrack(track);
  return track;
}
