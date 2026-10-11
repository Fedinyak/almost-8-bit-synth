import { transport } from './transport';

// --- МУЗЫКАЛЬНЫЕ И СИСТЕМНЫЕ КОНСТАНТЫ СЕТКИ СЕКВЕНСОРА ---
const BEATS_PER_MEASURE = 4; // Количество четвертных долей в одном такте (паттерне)
const STEPS_PER_BEAT = 4; // Количество 16-х шагов в одной четвертной доле
const SECONDS_IN_MINUTE = 60; // Секунд в минуте для расчета BPM

// --- СТАНДАРТНЫЕ МУЗЫКАЛЬНЫЕ ИДЕНТИФИКАТОРЫ И ФОЛБЕКИ ---
const SIXTEENTH_NOTE_ID = '16n'; // Идентификатор 16-й ноты в формате сетки
const DEFAULT_16TH_DURATION_SEC = 0.125; // Длительность 16-й ноты в секундах при дефолтных 120 BPM

export const musicalTime = {
  /**
   * Перевод музыкальных тактов (номеров паттернов) в физические секунды
   */
  measuresToSeconds(numberOfMeasures) {
    return (
      numberOfMeasures *
      ((SECONDS_IN_MINUTE / transport.bpm) * BEATS_PER_MEASURE)
    );
  },

  /**
   * Перевод длительности шага сетки (rate) в физические секунды
   */
  noteToSeconds(rate) {
    if (typeof rate === 'number') return rate;
    if (rate === SIXTEENTH_NOTE_ID)
      return SECONDS_IN_MINUTE / transport.bpm / STEPS_PER_BEAT;

    return DEFAULT_16TH_DURATION_SEC;
  },

  /**
   * Вычисление времени ноты с учетом текущей итерации циклического лупа
   */
  calculateProjectedTime(noteTime, currentTransportTime, loopEnd) {
    const currentLoopIteration = Math.floor(currentTransportTime / loopEnd);
    const baseProjectedTime = noteTime + currentLoopIteration * loopEnd;
    const isNoteBehindTransport = baseProjectedTime < currentTransportTime;

    return isNoteBehindTransport
      ? baseProjectedTime + loopEnd
      : baseProjectedTime;
  },

  /**
   * Проверка попадания времени ноты в текущее скользящее окно планирования
   */
  isNoteInSchedulingWindow(projectedTime, lastScheduledTime, endTransportTime) {
    const hasPassedLastSchedule = projectedTime > lastScheduledTime;
    const isBeforeOrAtWindowEnd = projectedTime <= endTransportTime;

    return hasPassedLastSchedule && isBeforeOrAtWindowEnd;
  },

  /**
   * Вычисление точного времени AudioContext для физического воспроизведения ноды
   */
  calculateExactAudioTime(
    projectedTime,
    currentTransportTime,
    currentContextTime,
  ) {
    const timeOffset = projectedTime - currentTransportTime;
    return currentContextTime + timeOffset;
  },

  /**
   * Вычисление точного интервала шага репитера графики с учетом BPM
   */
  calculateRepeaterInterval(repeater) {
    const isSixteenthNote = repeater.rate === SIXTEENTH_NOTE_ID;
    return isSixteenthNote
      ? SECONDS_IN_MINUTE / transport.bpm / STEPS_PER_BEAT
      : repeater.interval;
  },

  /**
   * Вычисление следующей временной точки для запуска повторителя графики
   */
  calculateNextRepeatTime(lastScheduledTime, interval) {
    const baseNextTime = Math.ceil(lastScheduledTime / interval) * interval;
    const isTimeBehindOrEqual = baseNextTime <= lastScheduledTime;

    return isTimeBehindOrEqual ? baseNextTime + interval : baseNextTime;
  },

  /**
   * Проверка: находится ли расчетная точка внутри текущего окна Look-Ahead
   */
  isRepeatTimeInWindow(nextRepeatTime, lastScheduledTime, scheduleUntilTime) {
    const hasPassedLastSchedule = nextRepeatTime > lastScheduledTime;
    const isBeforeOrAtWindowEnd = nextRepeatTime <= scheduleUntilTime;

    return hasPassedLastSchedule && isBeforeOrAtWindowEnd;
  },

  /**
   * Декларативный прогон цикла планирования долей репитера внутри скользящего окна
   */
  advanceRepeaterLoop(repeater, currentSeconds, scheduleUntilTime, now) {
    const interval = this.calculateRepeaterInterval(repeater);
    let nextRepeatTime = this.calculateNextRepeatTime(
      repeater.lastScheduledTime,
      interval,
    );

    while (nextRepeatTime <= scheduleUntilTime) {
      if (
        this.isRepeatTimeInWindow(
          nextRepeatTime,
          repeater.lastScheduledTime,
          scheduleUntilTime,
        )
      ) {
        const exactAudioTime = this.calculateExactAudioTime(
          nextRepeatTime,
          currentSeconds,
          now,
        );
        repeater.callback(exactAudioTime);
        repeater.lastScheduledTime = nextRepeatTime;
      }
      nextRepeatTime += interval;
    }
  },
};
