import {
  DRUM_PRESETS,
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  DRUM_TYPE_MAP,
} from '../../constants/soundParamsConfig';
// Подтягиваем рэк из нового адреса реэкспорта audioEngineCore
import { wrapInstrumentWithEffects } from '../../audio/core/audioEngineCore';

const createNoiseBuffer = (ctx, duration = 2.0) => {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

class NativeDrumAdapter {
  constructor(drumName, typeString, presetConfig) {
    this.drumName = drumName;
    this.typeString = typeString;
    this.presetConfig = presetConfig;
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
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});

    const now = this.ctx.currentTime;
    let ctxTime = typeof time === 'number' ? time : now;
    if (ctxTime < now) ctxTime = now;

    const currentAttack = this.envelope.attack;
    const currentDecay = this.envelope.decay;
    const targetGain = Math.pow(10, this._volumeValue / 20);

    if (this.lastGainParam) {
      try {
        this.lastGainParam.cancelScheduledValues(ctxTime);
        this.lastGainParam.setValueAtTime(this.lastGainParam.value, ctxTime);
        this.lastGainParam.linearRampToValueAtTime(0, ctxTime + 0.002);
      } catch (err) {}
    }

    const drumGain = this.ctx.createGain();
    drumGain.connect(this.outputNode);

    const debugGain = this.ctx.createGain();
    debugGain.gain.value = 0.05;
    drumGain.connect(debugGain);
    debugGain.connect(this.ctx.destination);

    this.lastGainParam = drumGain.gain;

    drumGain.gain.setValueAtTime(0, ctxTime);
    drumGain.gain.linearRampToValueAtTime(targetGain, ctxTime + currentAttack);
    drumGain.gain.linearRampToValueAtTime(
      0,
      ctxTime + currentAttack + currentDecay,
    );

    const totalDrumDuration = currentAttack + currentDecay;

    if (this.typeString === 'MembraneSynth') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const pDecay = this.presetConfig.pitchDecay || 0.08;
      osc.frequency.setValueAtTime(180, ctxTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctxTime + pDecay);
      osc.connect(drumGain);
      osc.start(ctxTime);
      osc.stop(ctxTime + totalDrumDuration);
    } else if (
      this.typeString === 'NoiseSynth' ||
      this.typeString === 'MetalSynth'
    ) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = createNoiseBuffer(this.ctx, totalDrumDuration);
      const filter = this.ctx.createBiquadFilter();

      if (this.drumName.toLowerCase().includes('snare')) {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, ctxTime);
        filter.Q.value = 1.0;
      } else {
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

const initializeRawDrumSynths = (typeMap) => {
  const synthEntries = Object.entries(typeMap).map(([drumName, typeString]) => {
    const presetConfig = DRUM_PRESETS[drumName] || {};
    return [
      drumName,
      new NativeDrumAdapter(drumName, typeString, presetConfig),
    ];
  });
  return Object.fromEntries(synthEntries);
};

const buildWrappedDrumsRack = (drumSynths) => {
  const wrappedEntries = Object.entries(drumSynths).map(
    ([drumName, rawSynth]) => {
      const instrumentPreset = DRUM_PRESETS[drumName] || {};
      return [
        drumName,
        wrapInstrumentWithEffects(
          rawSynth,
          instrumentPreset,
          DRUM_EFFECTS_CHAIN,
          EFFECT_DEVICES,
        ),
      ];
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
        if (drumContainer && typeof drumContainer.dispose === 'function')
          drumContainer.dispose();
      });
    },
  };
};

export default createDrums;
