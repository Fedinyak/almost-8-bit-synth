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

// --- ДЕФОЛТНЫЕ ТАЙМИНГИ АВТОМАТИЗАЦИИ ADSR-ОГИБАЮЩЕЙ ---
export const DEFAULT_ATTACK_RAMP_TIME_SEC = 0.005;
export const DEFAULT_DECAY_RAMP_TIME_SEC = 0.1;
export const DEFAULT_RELEASE_RAMP_TIME_SEC = 0.15;
export const DEFAULT_SUSTAIN_GAIN_MULTIPLIER = 0.5;

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

  // ДОБАВЛЕНО: Динамические параметры ADSR, привязанные к пресету или дефолту
  attackTime:
    typeof presetConfig.attack === 'number'
      ? presetConfig.attack
      : DEFAULT_ATTACK_RAMP_TIME_SEC,
  decayTime:
    typeof presetConfig.decay === 'number'
      ? presetConfig.decay
      : DEFAULT_DECAY_RAMP_TIME_SEC,
  sustainLevel:
    typeof presetConfig.sustain === 'number'
      ? presetConfig.sustain
      : DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
  releaseTime:
    typeof presetConfig.release === 'number'
      ? presetConfig.release
      : DEFAULT_RELEASE_RAMP_TIME_SEC,

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
export const isValidAdsrParam = (val) =>
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

// Внутренний хелпер: отрисовка динамической ADSR-огибающей на основе переданного стейта
const scheduleAdsrEnvelope = (
  gainParam,
  ctxTime,
  durationSeconds,
  targetGain,
  state, // Передаем состояние для динамических таймингов
) => {
  const attack = state?.attackTime ?? DEFAULT_ATTACK_RAMP_TIME_SEC;
  const decay = state?.decayTime ?? DEFAULT_DECAY_RAMP_TIME_SEC;
  const sustainMultiplier =
    state?.sustainLevel ?? DEFAULT_SUSTAIN_GAIN_MULTIPLIER;
  const release = state?.releaseTime ?? DEFAULT_RELEASE_RAMP_TIME_SEC;

  const sustainGain = targetGain * sustainMultiplier;
  const releaseStartTime = ctxTime + durationSeconds;

  gainParam.cancelScheduledValues(ctxTime);
  gainParam.setValueAtTime(ZERO_AUDIO_AMPLITUDE, ctxTime);

  // Стадия Атаки
  gainParam.linearRampToValueAtTime(targetGain, ctxTime + attack);

  // Стадия Спада
  gainParam.linearRampToValueAtTime(sustainGain, ctxTime + attack + decay);

  // Стадия Затухания (Релиз)
  gainParam.setValueAtTime(sustainGain, releaseStartTime);
  gainParam.linearRampToValueAtTime(
    ZERO_AUDIO_AMPLITUDE,
    releaseStartTime + release,
  );
};

// Внутренний хелпер: аварийное переключение гейна без сглаживания
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

// Публичный метод автоматизации огибающей громкости
// Публичный метод автоматизации огибающей громкости
export const applyEnvelopeAutomations = (
  gainParam,
  ctxTime,
  durationSeconds,
  volumeDecibels,
  state, // Передаем стейт
) => {
  const targetGain = Math.pow(10, volumeDecibels / 20);

  // ОТЛАДОЧНЫЙ ЛОГ №3: Проверяем, какие именно параметры ADSR летят в нативное ядро прямо сейчас
  if (state) {
    console.log(
      `[📈 ADSR TRIGGERED]: Attack = ${state.attackTime}s | Decay = ${state.decayTime}s | Sustain = ${state.sustainLevel} | Release = ${state.releaseTime}s`,
    );
  }

  try {
    scheduleAdsrEnvelope(
      gainParam,
      ctxTime,
      durationSeconds,
      targetGain,
      state,
    );
  } catch (error) {
    scheduleFallbackGate(gainParam, ctxTime, durationSeconds, targetGain);
  }
};

// --- СИСТЕМА СОВМЕСТИМОСТИ ДЛЯ ПОДКЛЮЧЕНИЯ ИНТЕРФЕЙСА REACT / REDUX ---
export const applySynthPropertyCompatibility = (adapter, state) => {
  // Добавляем сеттеры/геттеры динамических параметров прямо в адаптер
  adapter.getAttack = () => state.attackTime;
  adapter.setAttack = (val) => {
    if (isValidAdsrParam(val)) state.attackTime = val;
  };

  adapter.getDecay = () => state.decayTime;
  adapter.setDecay = (val) => {
    if (isValidAdsrParam(val)) state.decayTime = val;
  };

  adapter.getSustain = () => state.sustainLevel;
  adapter.setSustain = (val) => {
    if (isValidAdsrParam(val)) state.sustainLevel = val;
  };

  adapter.getRelease = () => state.releaseTime;
  adapter.setRelease = (val) => {
    if (isValidAdsrParam(val)) state.releaseTime = val;
  };

  adapter.getCutoff = () => state.filterCutoffValue;
  adapter.setCutoff = (val) => {
    if (typeof val === 'number' && !isNaN(val)) {
      state.filterCutoffValue = val;
      if (shouldUpdateActiveAudioHardware(state)) {
        state.nativeBiquad.frequency.setValueAtTime(val, state.ctx.currentTime);
      }
    }
  };

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

  // Честная эмуляция структуры объектов Tone.js для фильтра
  Object.defineProperty(adapter, 'filter', {
    get: () => ({
      frequency: {
        get value() {
          return adapter.getCutoff();
        },
        set value(val) {
          adapter.setCutoff(val);
        },
      },
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

  // Честная эмуляция структуры .envelope для ADSR крутилок интерфейса
  Object.defineProperty(adapter, 'envelope', {
    get: () => ({
      get attack() {
        return adapter.getAttack();
      },
      set attack(val) {
        adapter.setAttack(val);
      },

      get decay() {
        return adapter.getDecay();
      },
      set decay(val) {
        adapter.setDecay(val);
      },

      get sustain() {
        return adapter.getSustain();
      },
      set sustain(val) {
        adapter.setSustain(val);
      },

      get release() {
        return adapter.getRelease();
      },
      set release(val) {
        adapter.setRelease(val);
      },
    }),
  });
};
