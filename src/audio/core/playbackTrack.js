import { scheduler } from './scheduler';
import { musicalTime } from './musicalTime';

// --- СИСТЕМНЫЕ КОНСТАНТЫ ПЛАНИРОВАНИЯ И ТАЙМЛАЙНОВ ---
const SCHEDULER_BUFFER_OFFSET_SEC = -0.05; // Стартовое отрицательное смещение для захвата нот на нулевой отметке
const DEFAULT_LOOP_DURATION_SEC = 4.0; // Длительность лупа дорожки по умолчанию в секундах
const EMPTY_ARRAY_LENGTH = 0; // Лимит для проверки пустого массива нот

// --- ВЫНЕСЕННЫЕ ЛОКАЛЬНЫЕ ФУНКЦИИ ОБРАБОТКИ (ПОВЕДЕНИЕ) ---

const clearTrack = (track) => {
  track.notes = [];
  track.lastScheduledTime = SCHEDULER_BUFFER_OFFSET_SEC;
};

const addNoteToTrack = (track, timeInSeconds, noteData) => {
  track.notes = [...track.notes, { time: timeInSeconds, data: noteData }].sort(
    (a, b) => a.time - b.time,
  );
};

const setTrackLoopDuration = (track, numberOfMeasures) => {
  track.loopEnd = musicalTime.measuresToSeconds(numberOfMeasures);
};

// Проверка: пустой ли массив нот у дорожки
const isTrackNotesEmpty = (notes) => {
  return notes.length === EMPTY_ARRAY_LENGTH;
};

// Вычисление времени ноты с учетом текущего шага итерации лупа
const calculateProjectedTime = (noteTime, currentTransportTime, loopEnd) => {
  const currentLoopIteration = Math.floor(currentTransportTime / loopEnd);
  const baseProjectedTime = noteTime + currentLoopIteration * loopEnd;

  // Если нота осталась в прошлом цикле, сдвигаем её на один луп вперёд
  const isNoteBehindTransport = baseProjectedTime < currentTransportTime;

  return isNoteBehindTransport
    ? baseProjectedTime + loopEnd
    : baseProjectedTime;
};

// Проверка: попадает ли рассчитанное время ноты в текущий шаг скользящего окна планировщика
const isNoteInSchedulingWindow = (
  projectedTime,
  lastScheduledTime,
  endTransportTime,
) => {
  const hasPassedLastSchedule = projectedTime > lastScheduledTime;
  const isBeforeOrAtWindowEnd = projectedTime <= endTransportTime;

  return hasPassedLastSchedule && isBeforeOrAtWindowEnd;
};

// Вычисление точного системного времени AudioContext для воспроизведения
const calculateExactAudioTime = (
  projectedTime,
  currentTransportTime,
  currentContextTime,
) => {
  const timeOffset = projectedTime - currentTransportTime;
  return currentContextTime + timeOffset;
};

// Сканирование массива нот и отправка подходящих событий в аудио-коллбэк
const scheduleEligibleNotes = (
  track,
  onStepAction,
  currentTransportTime,
  endTransportTime,
  currentContextTime,
) => {
  track.notes.forEach((note) => {
    const projectedTime = calculateProjectedTime(
      note.time,
      currentTransportTime,
      track.loopEnd,
    );

    if (
      isNoteInSchedulingWindow(
        projectedTime,
        track.lastScheduledTime,
        endTransportTime,
      )
    ) {
      const exactAudioTime = calculateExactAudioTime(
        projectedTime,
        currentTransportTime,
        currentContextTime,
      );
      onStepAction(exactAudioTime, note.data);
    }
  });
};

const processTrackSchedule = (
  track,
  onStepAction,
  currentTransportTime,
  endTransportTime,
  currentContextTime,
) => {
  if (isTrackNotesEmpty(track.notes)) return;

  scheduleEligibleNotes(
    track,
    onStepAction,
    currentTransportTime,
    endTransportTime,
    currentContextTime,
  );

  track.lastScheduledTime = endTransportTime;
};

const disposeTrack = (track) => {
  scheduler.unregisterTrack(track);
  track.notes = [];
};

// --- КОНСТРУКТОР-ФАБРИКА СТРУКТУРЫ ДАННЫХ ---

export function PlaybackTrack(onStepAction) {
  const track = {
    notes: [],
    lastScheduledTime: SCHEDULER_BUFFER_OFFSET_SEC,
    loopEnd: DEFAULT_LOOP_DURATION_SEC,

    clear() {
      clearTrack(track);
    },
    add(timeInSeconds, noteData) {
      addNoteToTrack(track, timeInSeconds, noteData);
    },
    setLoopDuration(numberOfMeasures) {
      setTrackLoopDuration(track, numberOfMeasures);
    },
    processSchedule(
      currentTransportTime,
      endTransportTime,
      currentContextTime,
    ) {
      processTrackSchedule(
        track,
        onStepAction,
        currentTransportTime,
        endTransportTime,
        currentContextTime,
      );
    },
    dispose() {
      disposeTrack(track);
    },
  };

  scheduler.registerTrack(track);
  return track;
}
