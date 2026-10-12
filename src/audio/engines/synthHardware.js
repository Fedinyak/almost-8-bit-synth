// --- НАСТРОЙКИ СИНТЕЗА И СТАНДАРТНЫЕ ФОРМЫ ВОЛН (OSCILLATOR TYPES) ---
export const WAVEFORM_SQUARE = 'square';
export const WAVEFORM_SAWTOOTH = 'sawtooth';
export const WAVEFORM_TRIANGLE = 'triangle';

// --- СИСТЕМНЫЕ ЗВУКОВЫЕ КОНСТАНТЫ ---
export const ZERO_AUDIO_AMPLITUDE = 0;
export const DEFAULT_LOG_GAIN_DECIBELS = 0;
export const DEFAULT_FILTER_CUTOFF_HZ = 4500;
export const DEFAULT_FILTER_Q_VALUE = 1.0;
export const DEFAULT_PLAYBACK_DURATION_SEC = 0.2;

// --- ТАЙМИНГИ АВТОМАТИЗАЦИИ ADSR-ОГИБАЮЩЕЙ ---
export const ATTACK_RAMP_TIME_SEC = 0.005;
export const DECAY_RAMP_TIME_SEC = 0.1;
export const RELEASE_RAMP_TIME_SEC = 0.15;
export const SUSTAIN_GAIN_MULTIPLIER = 0.5;

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

export const isNodeMissing = (node) => !node;

// Валидаторы параметров
export const isValidVolumeNumber = (val) =>
  typeof val === 'number' && !isNaN(val);
export const isValidDetuneNumber = (val) =>
  typeof val === 'number' && !isNaN(val);
export const isValidFilterQ = (val) =>
  typeof val === 'number' && !isNaN(val) && val >= 0;

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

export const calculateTimelineTimes = (ctx, requestedTime) => {
  const now = ctx.currentTime;
  return typeof requestedTime === 'number' && requestedTime >= now
    ? requestedTime
    : now;
};

export const shouldUpdateActiveAudioHardware = ({
  isInitialized,
  outputNode,
  ctx,
}) => isInitialized && outputNode && ctx;
export const isAudioEngineContextMissing = (state) => !state.isInitialized;
export const canDisconnectFromHardware = (state) =>
  state.isConnectedToHardware && state.outputNode;

// Декларативное вычисление формы волны осциллятора на основе конфига пресета
export const getOscillatorType = (presetConfig) => {
  return presetConfig.oscillatorType || WAVEFORM_SQUARE;
};

// --- КОММУТАЦИЯ НИЗКОУРОВНЕВОГО ГРАФА И АВТОМАТИЗАЦИЯ ---

// Обновление физической громкости на аудио-ноде с деструктуризацией стейта
export const updateHardwareVolume = ({ outputNode, ctx }, decibelsValue) => {
  const linearGain = Math.pow(10, decibelsValue / 20);
  outputNode.gain.setValueAtTime(linearGain, ctx.currentTime);
};

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

// Низкоуровневое безопасное отключение встроенного biquad-фильтра с деструктуризацией аргументов
export const executeFilterDisconnect = ({ nativeBiquad }) => {
  if (isNodeMissing(nativeBiquad)) return;
  try {
    nativeBiquad.disconnect();
  } catch (e) {}
};

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

// Внутренний хелпер: отрисовка полноценной ADSR-огибающей (Attack, Decay, Sustain, Release)
const scheduleAdsrEnvelope = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
) => {
  const sustainGain = targetGain * SUSTAIN_GAIN_MULTIPLIER;
  const releaseStartTime = ctxTime + durationSeconds;

  gainParam.cancelScheduledValues(ctxTime);
  gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime);

  // Стадия Атаки (взлет звука)
  gainParam.linearRampToValueAtTime(targetGain, ctxTime + ATTACK_RAMP_TIME_SEC);

  // Стадия Спада (переход к удержанию)
  gainParam.linearRampToValueAtTime(
    sustainGain,
    ctxTime + ATTACK_RAMP_TIME_SEC + DECAY_RAMP_TIME_SEC,
  );

  // Стадия Затухания (после отпускания клавиши)
  gainParam.setValueAtTime(sustainGain, releaseStartTime);
  gainParam.linearRampToValueAtTime(
    ZERO_AUDIO_AMPLITUDE,
    releaseStartTime + RELEASE_RAMP_TIME_SEC,
  );
};

// Внутренний хелпер: аварийное переключение гейна без сглаживания, если системный таймер отстал
const scheduleFallbackGate = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
) => {
  try {
    gainParam.setValueAtTime(targetGain, ctxTime);
    gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime + durationSeconds);
  } catch (innerErr) {
    // Если аудио-поток жестко завис, глусим ноду, чтобы спасти уши пользователя
  }
};

// Публичный самодокументированный метод автоматизации огибающей громкости
export const applyEnvelopeAutomations = (
  gainParam,
  ctxTime,
  durationSeconds,
  volumeDecibels,
) => {
  const targetGain = Math.pow(10, volumeDecibels / 20);

  try {
    scheduleAdsrEnvelope(gainParam, ctxTime, durationSeconds, targetGain);
  } catch (error) {
    scheduleFallbackGate(gainParam, ctxTime, durationSeconds, targetGain);
  }
};

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
