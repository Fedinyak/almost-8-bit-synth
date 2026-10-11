// --- СИСТЕМНЫЕ ЗВУКОВЫЕ КОНСТАНТЫ ---
export const ZERO_AUDIO_AMPLITUDE = 0; // Полная тишина для аудио-параметра
export const DEFAULT_LOG_GAIN_DECIBELS = 0; // Дефолтный уровень громкости синта в децибелах
export const DEFAULT_FILTER_CUTOFF_HZ = 4500; // Частота среза фильтра по умолчанию
export const DEFAULT_FILTER_Q_VALUE = 1.0; // Добротность фильтра по умолчанию
export const DEFAULT_PLAYBACK_DURATION_SEC = 0.2; // Длительность ноты по умолчанию, если не передана

// --- ТАЙМИНГИ АВТОМАТИЗАЦИИ ADSR-ОГИБАЮЩЕЙ (ENVELOPE TIMINGS) ---
export const ATTACK_RAMP_TIME_SEC = 0.005; // Время атаки (взлет до пика)
export const DECAY_RAMP_TIME_SEC = 0.1; // Время спада до уровня сустейна
export const RELEASE_RAMP_TIME_SEC = 0.15; // Время затухания после отпускания ноты
export const SUSTAIN_GAIN_MULTIPLIER = 0.5; // Коэффициент громкости на стадии сустейна

// --- ИНИЦИАЛИЗАЦИЯ И ВАЛИДАЦИЯ СОСТОЯНИЙ ---

export const createInitialSynthState = (presetConfig) => ({
  volumeValue:
    typeof presetConfig.volume === 'number'
      ? presetConfig.volume
      : DEFAULT_LOG_GAIN_DECIBELS,
  detuneValue:
    typeof presetConfig.detune === 'number' ? presetConfig.detune : 0,
  filterCutoffValue:
    typeof presetConfig.filterLowpassCutoff === 'number'
      ? presetConfig.filterLowpassCutoff
      : DEFAULT_FILTER_CUTOFF_HZ,
  filterQValue: DEFAULT_FILTER_Q_VALUE,
  isInitialized: false,
  isConnectedToHardware: false,
  ctx: null,
  outputNode: null,
  nativeBiquad: null,
});

export const extractNativeAudioContext = (toneNode) => {
  return (
    toneNode.context?.rawContext || toneNode.context || window.audioContext
  );
};

export const isSynthReadyForPlayback = (isInitialized, ctx) => {
  return isInitialized && ctx;
};

export const ensureAudioContextIsActive = (ctx) => {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

// Защитный сдвиг времени, чтобы шедулер не пытался сыграть ноту в прошлом относительно аудио-карты
export const calculateTimelineTimes = (ctx, requestedTime) => {
  const now = ctx.currentTime;
  return typeof requestedTime === 'number' && requestedTime >= now
    ? requestedTime
    : now;
};

export const shouldUpdateActiveAudioHardware = (state) =>
  state.isInitialized && state.outputNode && state.ctx;
export const isAudioEngineContextMissing = (state) => !state.isInitialized;
export const canDisconnectFromHardware = (state) =>
  state.isConnectedToHardware && state.outputNode;

// --- КОММУТАЦИЯ НИЗКОУРОВНЕВОГО ГРАФА И АВТОМАТИЗАЦИЯ ---

export const routeAudioNodes = (outputNode, toneNode) => {
  const target = toneNode.input || toneNode;
  const nativeDestination =
    target._gainNode || target._node || target.input || target;
  try {
    outputNode.connect(nativeDestination);
  } catch (e) {
    if (typeof toneNode.connect === 'function') {
      try {
        outputNode.connect(toneNode);
      } catch (err) {}
    }
  }
};

export const executeHardwareDisconnect = (state, { outputNode }) => {
  try {
    outputNode.disconnect();
    state.isConnectedToHardware = false;
  } catch (e) {}
};

// Настройка осциллятора и подключение его к фильтру
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

// Прорисовка кривой ADSR громкости в Web Audio API параметре с защитным фоллбеком
export const applyEnvelopeAutomations = (
  gainParam,
  ctxTime,
  durationSeconds,
  volumeDecibels,
) => {
  const targetGain = Math.pow(10, volumeDecibels / 20);
  const sustainGain = targetGain * SUSTAIN_GAIN_MULTIPLIER;
  const releaseStartTime = ctxTime + durationSeconds;

  try {
    gainParam.cancelScheduledValues(ctxTime);
    gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime);
    gainParam.linearRampToValueAtTime(
      targetGain,
      ctxTime + ATTACK_RAMP_TIME_SEC,
    );
    gainParam.linearRampToValueAtTime(
      sustainGain,
      ctxTime + ATTACK_RAMP_TIME_SEC + DECAY_RAMP_TIME_SEC,
    );

    gainParam.setValueAtTime(sustainGain, releaseStartTime);
    gainParam.linearRampToValueAtTime(
      ZERO_AUDIO_AMPLITUDE,
      releaseStartTime + RELEASE_RAMP_TIME_SEC,
    );
  } catch (e) {
    // Аварийный прямоугольный режим без сглаживания, если системный таймер дал сбой
    try {
      gainParam.setValueAtTime(targetGain, ctxTime);
      gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime + durationSeconds);
    } catch (innerErr) {}
  }
};

// Создание плоских фасадов-прокси для полной совместимости со старыми Redux-рэками эффектов
export const applySynthPropertyCompatibility = (adapter) => {
  Object.defineProperty(adapter, 'volume', {
    get: () => ({
      get value() {
        return adapter.getVolume();
      },
      set value(val) {
        adapter.setVolume(val);
      },
    }),
  });

  Object.defineProperty(adapter, 'detune', {
    get: () => ({
      get value() {
        return adapter.getDetune();
      },
      set value(val) {
        adapter.setDetune(val);
      },
    }),
  });

  Object.defineProperty(adapter, 'filter', {
    get: () => ({
      Q: {
        get value() {
          return adapter.getFilterQ();
        },
        set value(val) {
          adapter.setFilterQ(val);
        },
      },
    }),
  });
};
