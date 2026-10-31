import { ZERO_AUDIO_AMPLITUDE, dbToLinearGain } from './synthHardware';

// --- КОНФИГУРАЦИЯ И КОНСТАНТЫ ---
// Перенесено из локальных областей видимости для снижения когнитивной нагрузки.
// В будущем эти параметры можно вынести в soundParamsConfig.js.
const EPSILON_GAIN_FLOOR = 0.0001;
const DECLICK_TIME_CONSTANT = 0.001;
const DECLICK_SAFETY_GAP = 0.003;
const ABSOLUTE_SILENCE_DELAY_SEC = 0.001;

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ ---
const isValidAudioParam = (param) =>
  param && typeof param.setValueAtTime === 'function';
const hasCustomEnvelopeSettings = (state) =>
  state !== null && state !== undefined;

// --- УТИЛИТЫ ДЛЯ СНИЖЕНИЯ КОГНИТИВНОЙ НАГРУЗКИ (АБСТРАКЦИИ НАД Web Audio API) ---
const resetAudioSchedule = (param, startTime) => {
  param.cancelScheduledValues(startTime);
};

const applyInstantGain = (param, value, time) => {
  param.setValueAtTime(value, time);
};

const applyLinearRamp = (param, value, time) => {
  param.linearRampToValueAtTime(value, time);
};

const applyExponentialRamp = (param, value, time) => {
  param.exponentialRampToValueAtTime(value, time);
};

const applyDeclickFade = (param, time) => {
  param.setTargetAtTime(EPSILON_GAIN_FLOOR, time, DECLICK_TIME_CONSTANT);
};

// --- ВЫЧИСЛИТЕЛЬНЫЕ ЧИСТЫЕ ФУНКЦИИ (ФУНКЦИОНАЛЬНОЕ ПРОГРАММИРОВАНИЕ) ---
const calculateSafeGain = (targetGain) =>
  Math.max(EPSILON_GAIN_FLOOR, targetGain);

const calculateSustainGain = (safeTargetGain, sustainMultiplier) =>
  Math.max(EPSILON_GAIN_FLOOR, safeTargetGain * sustainMultiplier);

const getEnvelopeValue = (state, key, defaultValue) =>
  hasCustomEnvelopeSettings(state)
    ? (state[key] ?? defaultValue)
    : defaultValue;

const getEnvelopeConfig = (state, defaults) => ({
  attack: getEnvelopeValue(
    state,
    'attackTime',
    defaults.DEFAULT_ATTACK_RAMP_TIME_SEC,
  ),
  decay: getEnvelopeValue(
    state,
    'decayTime',
    defaults.DEFAULT_DECAY_RAMP_TIME_SEC,
  ),
  sustainMultiplier: getEnvelopeValue(
    state,
    'sustainLevel',
    defaults.DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
  ),
  release: getEnvelopeValue(
    state,
    'releaseTime',
    defaults.DEFAULT_RELEASE_RAMP_TIME_SEC,
  ),
});

// --- ОСНОВНАЯ ЛОГИКА АВТОМАТИЗАЦИИ ---

export const applyOscillatorParameters = (
  osc,
  oscillatorType,
  frequencyHz,
  detuneValue,
  targetInputNode,
) => {
  const currentTime = osc.context.currentTime;

  osc.type = oscillatorType;
  applyInstantGain(osc.frequency, frequencyHz, currentTime);
  applyInstantGain(osc.detune, detuneValue, currentTime);
  osc.connect(targetInputNode);
};

const executeAdsrPipeline = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
  config,
) => {
  const safeTargetGain = calculateSafeGain(targetGain);
  const sustainGain = calculateSustainGain(
    safeTargetGain,
    config.sustainMultiplier,
  );

  const newAttackStartTime = ctxTime + DECLICK_SAFETY_GAP;
  const attackEndTime = newAttackStartTime + config.attack;
  const decayEndTime = attackEndTime + config.decay;
  const releaseStartTime = ctxTime + durationSeconds;
  const releaseEndTime = releaseStartTime + config.release;

  // 1. Стадия декликинга и инициализации новой ноты
  resetAudioSchedule(gainParam, ctxTime);
  applyDeclickFade(gainParam, ctxTime);
  applyInstantGain(gainParam, EPSILON_GAIN_FLOOR, newAttackStartTime);

  // 2. Стадия атаки (Линейный взлет для 8-битного транзиента)
  applyLinearRamp(gainParam, safeTargetGain, attackEndTime);

  // 3. Стадия спада (Экспоненциальный спуск до сустейна)
  applyExponentialRamp(gainParam, sustainGain, decayEndTime);

  // 4. Стадия релиза (Экспоненциальное затухание)
  applyExponentialRamp(gainParam, EPSILON_GAIN_FLOOR, releaseEndTime);

  // 5. Полная отсечка сигнала в абсолютный ноль
  applyInstantGain(
    gainParam,
    ZERO_AUDIO_AMPLITUDE,
    releaseEndTime + ABSOLUTE_SILENCE_DELAY_SEC,
  );
};

const executeFallbackGatePipeline = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
) => {
  applyInstantGain(gainParam, targetGain, ctxTime);
  applyInstantGain(gainParam, ZERO_AUDIO_AMPLITUDE, ctxTime + durationSeconds);
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

  if (isValidAudioParam(gainParam)) {
    const config = getEnvelopeConfig(state, defaults);
    executeAdsrPipeline(
      gainParam,
      ctxTime,
      durationSeconds,
      targetGain,
      config,
    );
    return;
  }

  if (gainParam) {
    executeFallbackGatePipeline(
      gainParam,
      ctxTime,
      durationSeconds,
      targetGain,
    );
  }
};
