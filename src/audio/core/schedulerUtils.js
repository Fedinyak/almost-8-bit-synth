import { musicalTime } from './musicalTime';

const EMPTY_ARRAY_LENGTH = 0;

// Проверка: пустой ли массив нот у дорожки
export const isTrackNotesEmpty = (notes) => notes.length === EMPTY_ARRAY_LENGTH;

// Проверка: должна ли конкретная нота прозвучать в текущем окне планировщика
export const shouldNoteBeScheduled = (
  note,
  track,
  currentTransportTime,
  endTransportTime,
) => {
  const projectedTime = musicalTime.calculateProjectedTime(
    note.time,
    currentTransportTime,
    track.loopEnd,
  );
  return musicalTime.isNoteInSchedulingWindow(
    projectedTime,
    track.lastScheduledTime,
    endTransportTime,
  );
};

// Воспроизведение ноты с вычислением точного нативного времени аудио-контекста
export const triggerAudioEvent = (
  note,
  track,
  onStepAction,
  currentTransportTime,
  currentContextTime,
) => {
  const projectedTime = musicalTime.calculateProjectedTime(
    note.time,
    currentTransportTime,
    track.loopEnd,
  );
  const exactAudioTime = musicalTime.calculateExactAudioTime(
    projectedTime,
    currentTransportTime,
    currentContextTime,
  );

  onStepAction(exactAudioTime, note.data);
};

// Фиксация крайней временной отметки, до которой планировщик уже обработал ноты
export const commitLastScheduledTime = (track, endTransportTime) => {
  track.lastScheduledTime = endTransportTime;
};
