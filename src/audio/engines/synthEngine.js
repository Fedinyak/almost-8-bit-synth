import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
// Теперь берем wrapInstrumentWithEffects из чистого реэкспорта audioEngineCore
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
    this.presetConfig = presetConfig;
    this.oscillatorType = presetConfig.oscillatorType || 'square';

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

    this.isInitialized = false;
    this.ctx = null;
    this.outputNode = null;
    this.nativeBiquad = null;

    const self = this;
    this.volume = {
      get value() {
        return self._volumeValue;
      },
      set value(val) {
        if (typeof val === 'number' && !isNaN(val)) {
          self._volumeValue = val;
          if (self.outputNode) {
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

  connect(toneNode) {
    if (!toneNode) return this;

    if (!this.isInitialized) {
      this.ctx =
        toneNode.context?.rawContext || toneNode.context || window.audioContext;

      this.outputNode = this.ctx.createGain();
      this.outputNode.gain.value = 0;

      this.nativeBiquad = this.ctx.createBiquadFilter();
      this.nativeBiquad.type = 'lowpass';
      this.nativeBiquad.frequency.value = this._filterCutoff;
      this.nativeBiquad.Q.value = this._filterQ;

      this.input = this.nativeBiquad;
      this.nativeBiquad.connect(this.outputNode);

      this.isInitialized = true;
      console.log(
        '[AUDIO DIAG]: Нативный синт лениво инициализирован в контексте эффекта:',
        this.ctx.constructor.name,
      );
    }

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
        '[AUDIO DIAG]: ✅ ЖЕЛЕЗОБЕТОННЫЙ УСПЕХ! Синт и Эффекты сошлись in одном контексте!',
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
    if (!this.isInitialized || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = this.ctx.currentTime;
    let ctxTime = typeof time === 'number' ? time : now;
    if (ctxTime < now) ctxTime = now;

    const parsedDuration =
      typeof duration === 'number' && duration > 0 ? duration : 0.2;

    const osc = this.ctx.createOscillator();
    osc.type = this.oscillatorType;

    const hz = noteToFrequency(note);
    osc.frequency.setValueAtTime(hz, ctxTime);
    osc.detune.setValueAtTime(this._detuneValue, ctxTime);

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
