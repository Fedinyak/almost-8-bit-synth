import { scheduler } from './scheduler';

export class PlaybackTrack {
  constructor(onStepAction) {
    this.onStepAction = onStepAction;
    this.notes = [];
    this.lastScheduledTime = -0.05;
    this.loopEnd = 4.0; // Значение по умолчанию в секундах

    // Регистрируем дорожку в центральном планировщике при создании
    scheduler.registerTrack(this);
  }

  // Безопасная мгновенная очистка нот без разрушения итератора
  clear() {
    this.notes = [];
    // Откатываем указатель назад, чтобы новые ноты на текущей позиции не пропустились
    this.lastScheduledTime = -0.05;
  }

  // Добавление ноты в таймлайн с сохранением хронологического порядка
  add(timeInSeconds, noteData) {
    this.notes.push({ time: timeInSeconds, data: noteData });
    this.notes.sort((a, b) => a.time - b.time);
  }

  // Черновой проход по нотам внутри окна планирования (вызывается шедулером)
  processSchedule(currentTransportTime, endTransportTime, currentContextTime) {
    const loopLength = this.loopEnd;
    if (this.notes.length === 0) return;

    this.notes.forEach((note) => {
      const noteTime = note.time;

      // Вычисляем, на какую итерацию глобального таймлайна попадает эта нота
      const currentLoopIteration = Math.floor(
        currentTransportTime / loopLength,
      );
      let projectedTime = noteTime + currentLoopIteration * loopLength;

      if (projectedTime < currentTransportTime) {
        projectedTime += loopLength;
      }

      // Проверяем, входит ли нота в текущее Look-Ahead окно
      if (
        projectedTime > this.lastScheduledTime &&
        projectedTime <= endTransportTime
      ) {
        const timeOffset = projectedTime - currentTransportTime;
        const exactAudioContextTime = currentContextTime + timeOffset;

        // Вызываем оригинальный коллбэк запуска звука
        this.onStepAction(exactAudioContextTime, note.data);
      }
    });

    this.lastScheduledTime = endTransportTime;
  }

  // Метод уничтожения дорожки для предотвращения утечек памяти
  dispose() {
    scheduler.unregisterTrack(this);
    this.notes = [];
  }
}
