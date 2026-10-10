// import * as Tone from 'tone';
// import {
//   DRUM_PRESETS,
//   DRUM_EFFECTS_CHAIN,
//   EFFECT_DEVICES,
//   DRUM_TYPE_MAP,
// } from '../../constants/soundParamsConfig';
// import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

// const TONE_CLASS_RESOLVER = {
//   MembraneSynth: Tone.MembraneSynth,
//   NoiseSynth: Tone.NoiseSynth,
//   MetalSynth: Tone.MetalSynth,
// };

// const initializeRawDrumSynths = (typeMap) => {
//   const synthEntries = Object.entries(typeMap).map(([drumName, typeString]) => {
//     const presetConfig = DRUM_PRESETS[drumName] || {};
//     const SynthClass = TONE_CLASS_RESOLVER[typeString] || Tone.MembraneSynth;

//     const nativeSynth = new SynthClass(presetConfig);
//     return [drumName, nativeSynth];
//   });

//   return Object.fromEntries(synthEntries);
// };

// const buildWrappedDrumsRack = (drumSynths) => {
//   const wrappedEntries = Object.entries(drumSynths).map(
//     ([drumName, rawSynth]) => {
//       const instrumentPreset = DRUM_PRESETS[drumName] || {};

//       const wrappedSynth = wrapInstrumentWithEffects(
//         rawSynth,
//         instrumentPreset,
//         DRUM_EFFECTS_CHAIN,
//         EFFECT_DEVICES,
//       );

//       return [drumName, wrappedSynth];
//     },
//   );

//   return Object.fromEntries(wrappedEntries);
// };

// const createDrums = () => {
//   const drumSynths = initializeRawDrumSynths(DRUM_TYPE_MAP);
//   const wrappedDrums = buildWrappedDrumsRack(drumSynths);

//   return {
//     ...wrappedDrums,
//     dispose() {
//       Object.values(wrappedDrums).forEach((drumContainer) => {
//         if (drumContainer && typeof drumContainer.dispose === 'function') {
//           drumContainer.dispose();
//         }
//       });
//     },
//   };
// };

// export default createDrums;

import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

// Генератор белого шума для снэров и хэтов
const createNoiseBuffer = (ctx, duration = 2.0) => {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// --- НАДРОДНЫЙ АДАПТЕР ДЛЯ БАРАБАНОВ ---
class NativeDrumAdapter {
  constructor(drumName, typeString, presetConfig) {
    this.drumName = drumName;
    this.typeString = typeString;
    this.presetConfig = presetConfig;

    // Ссылка на предыдущий узел Gain для гашения накладывающихся хвостов
    this.lastGainParam = null;

    this._volumeValue =
      typeof presetConfig.volume === 'number' ? presetConfig.volume : -12;
    const self = this;
    this.volume = {
      get value() {
        return self._volumeValue;
      },
      set value(val) {
        if (typeof val === 'number' && !isNaN(val)) {
          self._volumeValue = val;
          if (self.outputNode && self.ctx) {
            const targetGain = Math.pow(10, val / 20);
            self.outputNode.gain.setValueAtTime(
              targetGain,
              self.ctx.currentTime,
            );
          }
        }
      },
    };

    // Честная огибающая, завязанная на конфиг параметров из твоего нового файла
    this.envelope = {
      attack: presetConfig.attack || 0.005,
      decay: presetConfig.decay || 0.1,
      release: presetConfig.release || 0.3,
      set(params) {
        Object.assign(this, params);
      },
    };

    this.isInitialized = false;
    this.ctx = null;
    this.outputNode = null;
    this.input = null;
  }

  connect(toneNode) {
    if (!toneNode) return this;

    if (!this.isInitialized) {
      this.ctx =
        toneNode.context?.rawContext || toneNode.context || window.audioContext;

      this.outputNode = this.ctx.createGain();
      // Выставляем стартовую громкость из пресета
      this.outputNode.gain.value = Math.pow(10, this._volumeValue / 20);

      this.isInitialized = true;
      console.log(
        `[DRUM DIAG]: Барабан "${this.drumName}" лениво инициализирован.`,
      );
    }

    let target = toneNode.input || toneNode;
    const nativeDestination =
      target._gainNode || target._node || target.input || target;

    try {
      this.outputNode.connect(nativeDestination);
    } catch (e) {
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

  triggerAttackRelease(noteOrDuration, duration, time) {
    if (!this.isInitialized || !this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    let ctxTime = typeof time === 'number' ? time : now;
    if (ctxTime < now) ctxTime = now;

    // Считываем честные параметры огибающей из UI / пресета
    const currentAttack = this.envelope.attack;
    const currentDecay = this.envelope.decay;

    const targetGain = Math.pow(10, this._volumeValue / 20);

    // Гашение накладывающихся хвостов нот для предотвращения перегрузки
    if (this.lastGainParam) {
      try {
        this.lastGainParam.cancelScheduledValues(ctxTime);
        this.lastGainParam.setValueAtTime(this.lastGainParam.value, ctxTime);
        this.lastGainParam.linearRampToValueAtTime(0, ctxTime + 0.002);
      } catch (err) {}
    }

    const drumGain = this.ctx.createGain();
    drumGain.connect(this.outputNode);

    // Временный тихий отладочный провод в обход микшера
    const debugGain = this.ctx.createGain();
    debugGain.gain.value = 0.05;
    drumGain.connect(debugGain);
    debugGain.connect(this.ctx.destination);

    this.lastGainParam = drumGain.gain;

    // Безопасная огибающая громкости по честным параметрам пресета
    drumGain.gain.setValueAtTime(0, ctxTime);
    drumGain.gain.linearRampToValueAtTime(targetGain, ctxTime + currentAttack);
    drumGain.gain.linearRampToValueAtTime(
      0,
      ctxTime + currentAttack + currentDecay,
    );

    const totalDrumDuration = currentAttack + currentDecay;

    // --- ПОЛНОЦЕННЫЙ DSP СИНТЕЗ (Аналоговый/Синтезаторный стиль) ---
    if (this.typeString === 'MembraneSynth') {
      // 1. БОЧКА / ТОМ: Плотный, низкий синусоидальный пинок
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';

      const pDecay = this.presetConfig.pitchDecay || 0.08;

      // Запускаем с плотного щелчка (180 Гц) и мягко опускаем в глубокий саб-бас (45 Гц)
      osc.frequency.setValueAtTime(180, ctxTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctxTime + pDecay);

      osc.connect(drumGain);
      osc.start(ctxTime);
      osc.stop(ctxTime + totalDrumDuration);
    } else if (
      this.typeString === 'NoiseSynth' ||
      this.typeString === 'MetalSynth'
    ) {
      // 2. СНЭР / ХЭТЫ / РАЙД / КРЭШ (Полнодиапазонный генератор шума)
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(this.ctx, totalDrumDuration);

      // Вместо жесткого обрезания песка, ставим мягкий фильтр,
      // чтобы просто убрать ненужный инфра-низ, оставляя тело тарелок и снейра жирным
      const filter = this.ctx.createBiquadFilter();

      if (this.drumName.toLowerCase().includes('snare')) {
        // Снейру даем полосовой фильтр на 1000 Гц для плотного, пробивного шлепка в стиле драм-машин
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, ctxTime);
        filter.Q.value = 1.0;
      } else {
        // Тарелкам и хэтам (MetalSynth) ставим аккуратный Highpass, чтобы они не гудели в басу,
        // но сохраняли всю свою воздушность и длину
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, ctxTime);
      }

      noiseSource.connect(filter);
      filter.connect(drumGain);

      noiseSource.start(ctxTime);
      noiseSource.stop(ctxTime + totalDrumDuration);
    }
  }

  dispose() {
    this.disconnect();
  }
}

// --- ФАБРИКА БАРАБАНОВ ---
const initializeRawDrumSynths = (typeMap) => {
  const synthEntries = Object.entries(typeMap).map(([drumName, typeString]) => {
    const presetConfig = DRUM_PRESETS[drumName] || {};
    const nativeSynth = new NativeDrumAdapter(
      drumName,
      typeString,
      presetConfig,
    );
    return [drumName, nativeSynth];
  });
  return Object.fromEntries(synthEntries);
};

const buildWrappedDrumsRack = (drumSynths) => {
  const wrappedEntries = Object.entries(drumSynths).map(
    ([drumName, rawSynth]) => {
      const instrumentPreset = DRUM_PRESETS[drumName] || {};
      const wrappedSynth = wrapInstrumentWithEffects(
        rawSynth,
        instrumentPreset,
        DRUM_EFFECTS_CHAIN,
        EFFECT_DEVICES,
      );
      return [drumName, wrappedSynth];
    },
  );
  return Object.fromEntries(wrappedEntries);
};

const createDrums = () => {
  const drumSynths = initializeRawDrumSynths(DRUM_TYPE_MAP);
  const wrappedDrums = buildWrappedDrumsRack(drumSynths);
  return {
    ...wrappedDrums,
    dispose() {
      Object.values(wrappedDrums).forEach((drumContainer) => {
        if (drumContainer && typeof drumContainer.dispose === 'function') {
          drumContainer.dispose();
        }
      });
    },
  };
};

export default createDrums;
