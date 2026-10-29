import { noteToFrequency } from './synthMath';
import {
  isValidVolumeNumber,
  isValidDetuneNumber,
  isValidFilterQ,
  extractNativeAudioContext,
  isSynthReadyForPlayback,
  ensureAudioContextIsActive,
  calculateTimelineTimes,
  isAudioEngineContextMissing,
  shouldUpdateActiveAudioHardware,
  getOscillatorType,
  DEFAULT_PLAYBACK_DURATION_SEC,
  DEFAULT_LOG_GAIN_DECIBELS,
  DEFAULT_FILTER_CUTOFF_HZ,
  DEFAULT_FILTER_Q_VALUE,
  DEFAULT_ATTACK_RAMP_TIME_SEC,
  DEFAULT_DECAY_RAMP_TIME_SEC,
  DEFAULT_RELEASE_RAMP_TIME_SEC,
  DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
  DEFAULT_PORTAMENTO_SEC,
  DEFAULT_FILTER_ENV_OCTAVES,
} from './synthHardware';
import {
  createInitialSynthState,
  updateHardwareSynthVolume,
  updateHardwareFilterQ,
  executeFilterDisconnect,
  assembleNativeSynthGraph,
} from './synthEngineModel';
import {
  applyOscillatorParameters,
  applyEnvelopeAutomations,
} from './synthSynthesis';

const SYNTH_DEFAULTS = {
  DEFAULT_LOG_GAIN_DECIBELS,
  DEFAULT_FILTER_CUTOFF_HZ,
  DEFAULT_FILTER_Q_VALUE,
  DEFAULT_ATTACK_RAMP_TIME_SEC,
  DEFAULT_DECAY_RAMP_TIME_SEC,
  DEFAULT_RELEASE_RAMP_TIME_SEC,
  DEFAULT_SUSTAIN_GAIN_MULTIPLIER,
  DEFAULT_PORTAMENTO_SEC,
  DEFAULT_FILTER_ENV_OCTAVES,
};

const hasValidDuration = (duration) =>
  typeof duration === 'number' && duration > 0;

export const createNativeMonoSynthAdapter = (presetConfig) => {
  console.warn(
    `[🛠️ СИНТ СОЗДАН ЗАНОВО]: Фабрика сработала. Громкость пресета = ${presetConfig?.volume}`,
  );

  const state = createInitialSynthState(presetConfig, SYNTH_DEFAULTS);

  // Сохраняем признак монофонического движка из конфигурации пресета
  const isMonoEngine = presetConfig?.engineType === 'monoSynth';

  const adapter = {
    presetConfig,
    releaseTime: state.releaseTime,

    // Ссылка на внутренний стейт, куда мост запишет нативные attackTime/decayTime
    envelope: state,

    getVolume() {
      return state.volumeValue;
    },
    setVolume(val) {
      if (!isValidVolumeNumber(val)) return;
      state.volumeValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        updateHardwareSynthVolume(state, val);
      }
    },

    getDetune() {
      return state.detuneValue;
    },
    setDetune(val) {
      if (!isValidDetuneNumber(val)) return;
      state.detuneValue = val;

      // Если синт инициализирован и активен вечный моно-осциллятор — точечно обновляем его detune
      if (isMonoEngine && state.isInitialized && state.nativeOsc) {
        state.nativeOsc.detune.setValueAtTime(val, state.ctx.currentTime);
      }
    },

    getFilterQ() {
      return state.filterQValue;
    },
    setFilterQ(val) {
      if (!isValidFilterQ(val)) return;
      state.filterQValue = val;

      if (shouldUpdateActiveAudioHardware(state)) {
        updateHardwareFilterQ(state, val);
      }
    },

    connectInternal(pannerNode) {
      if (isAudioEngineContextMissing(state)) {
        state.ctx = extractNativeAudioContext(pannerNode);

        const nativeGraph = assembleNativeSynthGraph(state, pannerNode);

        state.outputNode = nativeGraph.outputNode;
        state.nativeBiquad = nativeGraph.nativeBiquad;
        state.isInitialized = true;

        // ПРОФЕССИОНАЛЬНАЯ МОНОФОНИЯ: Если прибор заявлен как моно-синт, мы жестко
        // инициализируем один вечный инстанс осциллятора в момент сборки сигнального тракта
        if (isMonoEngine) {
          const osc = state.ctx.createOscillator();
          applyOscillatorParameters(
            osc,
            getOscillatorType(presetConfig),
            0, // Стартуем в тишину, частота прилетит на первом тике
            state.detuneValue,
            state.nativeBiquad,
          );
          osc.start(state.ctx.currentTime);
          state.nativeOsc = osc; // Фиксируем вечную ноду в стейте чипа
          console.log(
            '   └─> [🎯 ВЕЧНЫЙ МОНОФОНИЧЕСКИЙ ОСЦИЛЛЯТОР ИНИЦИАЛИЗИРОВАН]',
          );
        }

        console.log('   └─> [🎯 ВНУТРЕННЯЯ НАТИВНАЯ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА]');
      }

      state.isConnectedToHardware = true;
      return state;
    },

    triggerAttackRelease(note, duration, time) {
      if (!isSynthReadyForPlayback(state.isInitialized, state.ctx)) return;
      ensureAudioContextIsActive(state.ctx);

      const ctxTime = calculateTimelineTimes(state.ctx, time);
      const parsedDuration = hasValidDuration(duration)
        ? duration
        : DEFAULT_PLAYBACK_DURATION_SEC;

      const targetFrequency = noteToFrequency(note);

      if (isMonoEngine && state.nativeOsc) {
        // СТРАТЕГИЯ А: Жесткое нативное моно (Note Stealing / Phase Restart)
        // Мгновенно перестраиваем частоту вечного осциллятора без выделения памяти
        state.nativeOsc.frequency.setValueAtTime(targetFrequency, ctxTime);

        // Передаем пинок огибающей громкости, которая сама сбросит старый релиз
        applyEnvelopeAutomations(
          state.outputNode.gain,
          ctxTime,
          parsedDuration,
          state.volumeValue,
          state,
          SYNTH_DEFAULTS,
        );
      } else {
        // СТРАТЕГИЯ Б: Полифонический сэмплерный триггер для перкуссии (Барабанов)
        // Сохраняем твой исходный алгоритм наложения хвостов для сохранения плотности сбивок
        const osc = state.ctx.createOscillator();

        applyOscillatorParameters(
          osc,
          getOscillatorType(presetConfig),
          targetFrequency,
          state.detuneValue,
          state.nativeBiquad,
        );

        applyEnvelopeAutomations(
          state.outputNode.gain,
          ctxTime,
          parsedDuration,
          state.volumeValue,
          state,
          SYNTH_DEFAULTS,
        );

        const releaseStartTime = ctxTime + parsedDuration;
        osc.start(ctxTime);
        osc.stop(releaseStartTime + state.releaseTime);
      }
    },

    dispose() {
      console.warn(
        '[🗑️ DISPOSE СИНТА]: Вызван метод очистки ресурсов из памяти!',
      );
      // Если активен вечный осциллятор — принудительно глушим его перед разрывом графа
      if (isMonoEngine && state.nativeOsc) {
        try {
          state.nativeOsc.stop();
        } catch (e) {}
        state.nativeOsc = null;
      }
      executeFilterDisconnect(state);
    },
  };

  return { adapter, state };
};
