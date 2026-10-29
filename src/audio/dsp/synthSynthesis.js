import { ZERO_AUDIO_AMPLITUDE, dbToLinearGain } from './synthHardware';

export const applyOscillatorParameters = (
  osc,
  oscillatorType,
  frequencyHz,
  detuneValue,
  targetInputNode,
) => {
  osc.type = oscillatorType;
  osc.frequency.setValueAtTime(frequencyHz, osc.context.currentTime);
  osc.detune.setValueAtTime(detuneValue, osc.context.currentTime);
  osc.connect(targetInputNode);
};

const scheduleAdsrEnvelope = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
  state,
  defaults,
) => {
  const attack = state?.attackTime ?? defaults.DEFAULT_ATTACK_RAMP_TIME_SEC;
  const decay = state?.decayTime ?? defaults.DEFAULT_DECAY_RAMP_TIME_SEC;
  const sustainMultiplier =
    state?.sustainLevel ?? defaults.DEFAULT_SUSTAIN_GAIN_MULTIPLIER;
  const release = state?.releaseTime ?? defaults.DEFAULT_RELEASE_RAMP_TIME_SEC;

  // Математический лимит Web Audio API: экспоненциальная рампа рухнет в ошибку, если
  // целевая амплитуда будет равна строгому нулю. Мы используем профессиональный аудио-порог
  // отсечки (floor gain).
  const EPSILON_GAIN_FLOOR = 0.0001;

  // Калибруем целевые уровни громкости, защищая их от падения в чистый ноль
  const safeTargetGain = Math.max(EPSILON_GAIN_FLOOR, targetGain);
  const sustainGain = Math.max(
    EPSILON_GAIN_FLOOR,
    safeTargetGain * sustainMultiplier,
  );
  const releaseStartTime = ctxTime + durationSeconds;

  // 1. ЭКСПОНЕНЦИАЛЬНЫЙ ДЕКЛИКЕР (Phase De-clicking): Быстрое скругленное гашение
  // предыдущего играющего хвоста за 3 мс. Никаких вертикальных ступенек.
  const DECLICK_TIME_CONSTANT = 0.001;
  const DECLICK_SAFETY_GAP = 0.003;

  gainParam.cancelScheduledValues(ctxTime);
  gainParam.setTargetAtTime(EPSILON_GAIN_FLOOR, ctxTime, DECLICK_TIME_CONSTANT);

  // Мягко стартуем Атаку новой ноты из скругленного нуля
  const newAttackStartTime = ctxTime + DECLICK_SAFETY_GAP;
  gainParam.setValueAtTime(EPSILON_GAIN_FLOOR, newAttackStartTime);

  // 2. СТАДИЯ АТАКИ (Attack Stage): Линейный или экспоненциальный взлет до пика громкости.
  // Оставляем линейный рампа-клик для сохранения пробивного 8-битного транзиента (щелчка атаки).
  const attackEndTime = newAttackStartTime + attack;
  gainParam.linearRampToValueAtTime(safeTargetGain, attackEndTime);

  // 3. СТАДИЯ СПАДА (Decay Stage): Переходим на честную нативную ЭКСПОНЕНТУ.
  // Волна опускается до уровня сустейна по мягкой скругленной траектории, как в Tone.js.
  const decayEndTime = attackEndTime + decay;
  gainParam.exponentialRampToValueAtTime(sustainGain, decayEndTime);

  // 4. СТАДИЯ РЕЛИЗА (Release Stage): Бесшовный экспоненциальный спад до тишины.
  // Полностью убраны любые setValueAtTime. В момент окончания шага секвенсора (releaseStartTime)
  // кривая подхватывает текущее живое значение сустейна и уводит его в точку отсечки по плавной
  // аналоговой дуге. На средних частотах синуса и при рулёжке ADSR мышиные изломы исчезают.
  const releaseEndTime = releaseStartTime + release;
  gainParam.exponentialRampToValueAtTime(EPSILON_GAIN_FLOOR, releaseEndTime);

  // Наглухо закрываем цифровой шлюз в абсолютную тишину сразу после окончания релиза
  gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, releaseEndTime + 0.001);
};

const scheduleFallbackGate = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
) => {
  try {
    gainParam.setValueAtTime(targetGain, ctxTime);
    gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime + durationSeconds);
  } catch (innerErr) {}
};

export const applyEnvelopeAutomations = (
  gainParam,
  ctxTime,
  durationSeconds,
  volumeDecibels,
  state,
  defaults,
) => {
  const targetGain = dbToLinearGain(volumeDecibels);

  try {
    scheduleAdsrEnvelope(
      gainParam,
      ctxTime,
      durationSeconds,
      targetGain,
      state,
      defaults,
    );
  } catch (error) {
    scheduleFallbackGate(gainParam, ctxTime, durationSeconds, targetGain);
  }
};
