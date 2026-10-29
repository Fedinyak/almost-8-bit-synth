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

  const sustainGain = targetGain * sustainMultiplier;
  const releaseStartTime = ctxTime + durationSeconds;

  // АНТИ-ЩЕЛЧОК (De-clicking): Вместо жесткого setValueAtTime(0) плавно гасим
  // текущую амплитуду волны за безопасные 2 миллисекунды (0.002s), убирая разрыв фазы
  const DECLICK_DURATION_SEC = 0.002;
  gainParam.cancelScheduledValues(ctxTime);
  gainParam.linearRampToValueAtTime(
    ZERO_AUDIO_AMPLITUDE,
    ctxTime + DECLICK_DURATION_SEC,
  );

  // Запускаем Атаку новой ноты сразу после микро-затухания
  const newAttackStartTime = ctxTime + DECLICK_DURATION_SEC;
  gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, newAttackStartTime);
  gainParam.linearRampToValueAtTime(targetGain, newAttackStartTime + attack);
  gainParam.linearRampToValueAtTime(
    sustainGain,
    newAttackStartTime + attack + decay,
  );

  gainParam.setValueAtTime(sustainGain, releaseStartTime);
  gainParam.linearRampToValueAtTime(
    ZERO_AUDIO_AMPLITUDE,
    releaseStartTime + release,
  );
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
