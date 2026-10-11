import { scheduler } from './scheduler';
import { musicalTime } from './musicalTime';

// --- СИСТЕМНЫЕ КОНСТАНТЫ ПЛАНИРОВАНИЯ И ТАЙМЛАЙНОВ ---
const SCHEDULER_BUFFER_OFFSET_SEC = -0.05; // Стартовое отрицательное смещение для захвата нот на нулевой отметке
const DEFAULT_LOOP_DURATION_SEC = 4.0; // Длительность лупа дорожки по умолчанию в секундах
const EMPTY_ARRAY_LENGTH = 0; // Лимит для проверки пустого массива нот

export class PlaybackTrack {
  constructor(onStepAction) {
    this.onStepAction = onStepAction;
    this.notes = [];
    this.lastScheduledTime = SCHEDULER_BUFFER_OFFSET_SEC;
    this.loopEnd = DEFAULT_LOOP_DURATION_SEC;

    // Автоматическая регистрация дорожки в глобальном планировщике событий
    scheduler.registerTrack(this);
  }

  // Мгновенная безопасная очистка таймлайна дорожки
  clear() {
    this.notes = [];
    // Откатываем указатель назад во избежание пропусков нот при горячей перезаписи сетки
    this.lastScheduledTime = SCHEDULER_BUFFER_OFFSET_SEC;
  }

  // Хронологическое добавление музыкального события в массив
  add(timeInSeconds, noteData) {
    this.notes.push({ time: timeInSeconds, data: noteData });
    this.notes.sort((a, b) => a.time - b.time);
  }

  // Изменение длины циклического лупа дорожки на основе музыкальных тактов
  setLoopDuration(numberOfMeasures) {
    this.loopEnd = musicalTime.measuresToSeconds(numberOfMeasures);
  }

  // Проход Look-Ahead планировщика по нотам (вызывается из scheduler.js)
  processSchedule(currentTransportTime, endTransportTime, currentContextTime) {
    const loopLength = this.loopEnd;
    if (this.notes.length === EMPTY_ARRAY_LENGTH) return;

    this.notes.forEach((note) => {
      const noteTime = note.time;

      // Рассчитываем, на какую итерацию лупа проецируется текущее время часов
      const currentLoopIteration = Math.floor(
        currentTransportTime / loopLength,
      );
      let projectedTime = noteTime + currentLoopIteration * loopLength;

      if (projectedTime < currentTransportTime) {
        projectedTime += loopLength;
      }

      // Проверяем попадание ноты в текущее скользящее окно планирования
      if (
        projectedTime > this.lastScheduledTime &&
        projectedTime <= endTransportTime
      ) {
        const timeOffset = projectedTime - currentTransportTime;
        const exactAudioContextTime = currentContextTime + timeOffset;

        // Стреляем нативным аудио-коллбэком инструмента
        this.onStepAction(exactAudioContextTime, note.data);
      }
    });

    this.lastScheduledTime = endTransportTime;
  }

  // Полная деструктуризация дорожки для исключения утечек памяти
  dispose() {
    scheduler.unregisterTrack(this);
    this.notes = [];
  }
}
