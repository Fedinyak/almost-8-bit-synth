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
   * Перевод музыкальных тактов (номеров паттернов) в физические секунды на основе ЖИВОГО BPM
   */
  measuresToSeconds(numberOfMeasures) {
    return (
      numberOfMeasures *
      ((SECONDS_IN_MINUTE / transport.bpm) * BEATS_PER_MEASURE)
    );
  },

  /**
   * Парсинг музыкальной строки трекера '0:1:2' в относительные секунды внутри одного паттерна на лету
   */
  parsePositionToSeconds(timeStr, activeBpm) {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;

    const measures = parseInt(parts[0], 10) || 0;
    const beats = parseInt(parts[1], 10) || 0;
    const sixteenths = parseInt(parts[2], 10) || 0;

    const secondsPerBeat = SECONDS_IN_MINUTE / activeBpm;
    const secondsPerMeasure = secondsPerBeat * BEATS_PER_MEASURE;
    const secondsPerStep = secondsPerBeat / STEPS_PER_BEAT;

    return (
      measures * secondsPerMeasure +
      beats * secondsPerBeat +
      sixteenths * secondsPerStep
    );
  },

  /**
   * Расчет абсолютных физических секунд для ноты с учетом её позиции и индекса такта на лету
   */
  calculateAbsoluteSeconds(musicalTimeValue, measureIndex, activeBpm) {
    const secondsPerBeat = SECONDS_IN_MINUTE / activeBpm;
    const secondsPerMeasure = secondsPerBeat * BEATS_PER_MEASURE;

    const stepSeconds =
      typeof musicalTimeValue === 'string'
        ? musicalTime.parsePositionToSeconds(musicalTimeValue, activeBpm)
        : musicalTimeValue;

    const measureSeconds = measureIndex * secondsPerMeasure;

    return stepSeconds + measureSeconds;
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
  calculateProjectedTime(noteTime, currentTransportTime, loopEndSeconds) {
    const currentLoopIteration = Math.floor(
      currentTransportTime / loopEndSeconds,
    );
    const baseProjectedTime = noteTime + currentLoopIteration * loopEndSeconds;
    const isNoteBehindTransport = baseProjectedTime < currentTransportTime;

    return isNoteBehindTransport
      ? baseProjectedTime + loopEndSeconds
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
