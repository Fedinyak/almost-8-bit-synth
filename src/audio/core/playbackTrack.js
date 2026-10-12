import { scheduler } from './scheduler';
import { musicalTime } from './musicalTime';
import { transport } from './transport';

// --- СИСТЕМНЫЕ КОНСТАНТЫ ПЛАНИРОВАНИЯ И ТАЙМЛАЙНОВ ---
const SCHEDULER_BUFFER_OFFSET_SEC = -0.05; // Стартовое отрицательное смещение для захвата нот на нулевой отметке
const DEFAULT_LOOP_MEASURES_COUNT = 4; // Количество тактов лупа дорожки по умолчанию
const EMPTY_ARRAY_LENGTH = 0; // Лимит для проверки пустого массива нот

// --- ВЫНЕСЕННЫЕ ЛОКАЛЬНЫЕ ФУНКЦИИ ПРОВЕРКИ И ПЛАНИРОВАНИЯ ---

const isTrackNotesEmpty = (notes) => notes.length === EMPTY_ARRAY_LENGTH;

const commitLastScheduledTime = (track, endTransportTime) => {
  track.lastScheduledTime = endTransportTime;
};

// --- КОНСТРУКТОР-ФАБРИКА СТРУКТУРЫ ДАННЫХ ---

export function PlaybackTrack(onStepAction) {
  const track = {
    notes: [],
    lastScheduledTime: SCHEDULER_BUFFER_OFFSET_SEC,
    loopEnd: DEFAULT_LOOP_MEASURES_COUNT, // Храним длину в тактах

    // Мгновенная безопасная очистка таймлайна дорожки
    clear() {
      track.notes = [];
      track.lastScheduledTime = SCHEDULER_BUFFER_OFFSET_SEC;
    },

    // Декларативное добавление музыкальной координаты без физических секунд
    add(musicalTimeValue, measureIndex, noteData, phaseOffset = 0) {
      track.notes = [
        ...track.notes,
        { musicalTimeValue, measureIndex, phaseOffset, data: noteData },
      ];
    },

    // Изменение длины циклического лупа дорожки на основе музыкальных тактов
    setLoopDuration(numberOfMeasures) {
      track.loopEnd = numberOfMeasures;
    },

    // Проход Look-Ahead планировщика по нотам (вызывается из scheduler.js)
    processSchedule(
      currentTransportTime,
      endTransportTime,
      currentContextTime,
    ) {
      if (isTrackNotesEmpty(track.notes)) return;

      const activeBpm = transport.bpm;
      const loopEndSeconds = musicalTime.measuresToSeconds(track.loopEnd);

      track.notes.forEach((note) => {
        // Вычисляем точную физическую секунду старта ноты на лету!
        const calculatedSeconds =
          musicalTime.calculateAbsoluteSeconds(
            note.musicalTimeValue,
            note.measureIndex,
            activeBpm,
          ) + note.phaseOffset;

        const projectedTime = musicalTime.calculateProjectedTime(
          calculatedSeconds,
          currentTransportTime,
          loopEndSeconds,
        );

        if (
          musicalTime.isNoteInSchedulingWindow(
            projectedTime,
            track.lastScheduledTime,
            endTransportTime,
          )
        ) {
          const exactAudioTime = musicalTime.calculateExactAudioTime(
            projectedTime,
            currentTransportTime,
            currentContextTime,
          );
          onStepAction(exactAudioTime, note.data);
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
