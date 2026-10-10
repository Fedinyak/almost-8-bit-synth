// import * as Tone from 'tone';
// import {
//   DRUM_EFFECTS_CHAIN,
//   EFFECT_DEVICES,
//   SYNTH_PRESETS,
// } from '../../constants/soundParamsConfig';
// import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

// const createSynth = (synthName) => {
//   const presetConfig = SYNTH_PRESETS[synthName] || {};

//   const rawSynth = new Tone.MonoSynth({
//     oscillator: { type: presetConfig.oscillatorType || 'square' },
//     envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
//   });

//   return wrapInstrumentWithEffects(
//     rawSynth,
//     presetConfig,
//     DRUM_EFFECTS_CHAIN,
//     EFFECT_DEVICES,
//   );
// };

// export default createSynth;
import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

// Утилита перевода "C4", "D#3" в Герцы
const noteToFrequency = (noteStr) => {
  if (!noteStr || typeof noteStr !== 'string') return 440;
  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const hasSharp = noteStr[1] === '#';
  const pitch = hasSharp ? noteStr.slice(0, 2) : noteStr[0];
  const octaveStr = hasSharp ? noteStr.slice(2) : noteStr.slice(1);
  const semitoneOffset = notes.indexOf(pitch);
  const octave = parseInt(octaveStr, 10);
  if (semitoneOffset === -1 || isNaN(octave)) return 440;
  const midiNumber = (octave + 1) * 12 + semitoneOffset;
  return 440 * Math.pow(2, (midiNumber - 69) / 12);
};

class NativeMonoSynthAdapter {
  constructor(presetConfig) {
    // Сохраняем пресеты для ленивой инициализации
    this.presetConfig = presetConfig;
    this.oscillatorType = presetConfig.oscillatorType || 'square';

    // Инициализируем стейт параметров, чтобы внешние ручки UI могли писать сюда до коннекта
    this._volumeValue =
      typeof presetConfig.volume === 'number' ? presetConfig.volume : 0;
    this._detuneValue =
      typeof presetConfig.detune === 'number' ? presetConfig.detune : 0;
    this._filterCutoff =
      typeof presetConfig.filterLowpassCutoff === 'number'
        ? presetConfig.filterLowpassCutoff
        : 4500;
    this._filterQ = 1.0;

    this.portamento = 0;
    this.filterEnvelope = { octaves: 0 };

    // Флаг сборки графа
    this.isInitialized = false;
    this.ctx = null;
    this.outputNode = null;
    this.nativeBiquad = null;

    // Пропсы-геттеры/сеттеры для внешнего LFO-конвейера и ручек модуляции
    const self = this;
    this.volume = {
      get value() {
        return self._volumeValue;
      },
      set value(val) {
        if (typeof val === 'number' && !isNaN(val)) {
          self._volumeValue = val;
          if (self.outputNode) {
            // Если граф уже собран — плавно применяем громкость
            const targetGain = Math.pow(10, val / 20);
            self.outputNode.gain.setValueAtTime(
              targetGain,
              self.ctx.currentTime,
            );
          }
        }
      },
    };

    this.detune = {
      get value() {
        return self._detuneValue;
      },
      set value(val) {
        if (typeof val === 'number' && !isNaN(val)) self._detuneValue = val;
      },
    };

    this.filter = {
      Q: {
        get value() {
          return self._filterQ;
        },
        set value(val) {
          if (typeof val === 'number' && !isNaN(val) && val >= 0) {
            self._filterQ = val;
            if (self.nativeBiquad) {
              self.nativeBiquad.Q.setValueAtTime(val, self.ctx.currentTime);
            }
          }
        },
      },
    };
  }

  // МЕТОД СОПРЯЖЕНИЯ С СИНХРОНИЗАЦИЕЙ КОНТЕКСТА
  connect(toneNode) {
    if (!toneNode) return this;

    // 1. ВЫТАСКИВАЕМ ИСТИННЫЙ НАТИВНЫЙ КОНТЕКСТ ИЗ ЭФФЕКТА TONE.JS
    // Это гарантирует, что наши ноды будут жить в ОДНОЙ вселенной с эффектами
    if (!this.isInitialized) {
      this.ctx =
        toneNode.context?.rawContext || toneNode.context || window.audioContext;

      // Создаем нативные узлы внутри правильного контекста
      this.outputNode = this.ctx.createGain();
      this.outputNode.gain.value = 0;

      this.nativeBiquad = this.ctx.createBiquadFilter();
      this.nativeBiquad.type = 'lowpass';
      this.nativeBiquad.frequency.value = this._filterCutoff;
      this.nativeBiquad.Q.value = this._filterQ;

      // Замыкаем внутреннюю цепь синта
      this.input = this.nativeBiquad;
      this.nativeBiquad.connect(this.outputNode);

      this.isInitialized = true;
      console.log(
        '[AUDIO DIAG]: Нативный синт лениво инициализирован в контексте эффекта:',
        this.ctx.constructor.name,
      );
    }

    // 2. Расковыриваем целевой узел эффекта до C++
    let target = toneNode.input || toneNode;
    const nativeDestination =
      target._gainNode || target._node || target.input || target;

    console.log(
      '[AUDIO DIAG]: Стыковка в одном контексте. Цель:',
      nativeDestination.constructor.name,
    );

    try {
      this.outputNode.connect(nativeDestination);
      console.log(
        '[AUDIO DIAG]: ✅ ЖЕЛЕЗОБЕТОННЫЙ УСПЕХ! Синт и Эффекты сошлись в одном контексте!',
      );
    } catch (e) {
      console.error(
        '[AUDIO DIAG]: Коннект сорвался даже в одном контексте:',
        e.message,
      );
      if (typeof toneNode.connect === 'function') {
        try {
          toneNode.connect(this.outputNode);
        } catch (err) {}
      }
    }
    return this;
  }

  disconnect() {
    try {
      if (this.outputNode) this.outputNode.disconnect();
    } catch (e) {}
    return this;
  }

  triggerAttackRelease(note, duration, time) {
    // Если по какой-то причине нота сработала до connect, игнорируем удар во избежание краша
    if (!this.isInitialized || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    let ctxTime = typeof time === 'number' ? time : now;
    if (ctxTime < now) ctxTime = now;

    const parsedDuration =
      typeof duration === 'number' && duration > 0 ? duration : 0.2;

    // Создаем одноразовый осциллятор внутри правильного контекста
    const osc = this.ctx.createOscillator();
    osc.type = this.oscillatorType;

    const hz = noteToFrequency(note);
    osc.frequency.setValueAtTime(hz, ctxTime);
    osc.detune.setValueAtTime(this._detuneValue, ctxTime);

    // Подключаем строго во внутренний нативный фильтр.
    // Аварийный провод УБРАН — звук обязан пойти через общую цепь!
    osc.connect(this.input);

    const gainParam = this.outputNode.gain;
    const targetGain = Math.pow(10, this._volumeValue / 20);

    try {
      gainParam.cancelScheduledValues(ctxTime);
      gainParam.setValueAtTime(0, ctxTime);
      gainParam.linearRampToValueAtTime(targetGain, ctxTime + 0.005);
      gainParam.linearRampToValueAtTime(targetGain * 0.5, ctxTime + 0.1);

      const releaseStartTime = ctxTime + parsedDuration;
      gainParam.setValueAtTime(targetGain * 0.5, releaseStartTime);
      gainParam.linearRampToValueAtTime(0, releaseStartTime + 0.15);

      osc.start(ctxTime);
      osc.stop(releaseStartTime + 0.15);
    } catch (e) {
      try {
        gainParam.setValueAtTime(targetGain, ctxTime);
        osc.start(ctxTime);
        gainParam.setValueAtTime(0, ctxTime + parsedDuration);
        osc.stop(ctxTime + parsedDuration);
      } catch (innerErr) {}
    }
  }

  dispose() {
    this.disconnect();
    try {
      if (this.nativeBiquad) this.nativeBiquad.disconnect();
    } catch (e) {}
  }
}

const createSynth = (synthName) => {
  const presetConfig = SYNTH_PRESETS[synthName] || {};
  const rawSynth = new NativeMonoSynthAdapter(presetConfig);
  return wrapInstrumentWithEffects(
    rawSynth,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );
};

export default createSynth;
