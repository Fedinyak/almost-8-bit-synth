import { ANALYSER_SIZE } from '../../constants/audioEngineConfig';
import {
  dbToLinearGain,
  linearGainToDb,
  isParamChangeSignificant,
} from '../../utils/audioMathUtils';
import { getNativeContext } from './nativeContext';

/**
 * АДАПТЕР НАТИВНОГО ОБЪЕМА (VOLUME): Полная замена Tone.Volume
 * Защищает от краша метод .toDestination() в audioEngineTriggers и маскирует AudioParam под интерфейс
 */
class NativeVolumeAdapter {
  constructor() {
    const ctx = getNativeContext();
    this.nativeGain = ctx.createGain();
    this.input = this.nativeGain;
    this.output = this.nativeGain;
    this._bypassed = false;

    // Эмуляция структуры .volume.value для плавного Ramper'а и слайдеров UI
    this._volumeParamWrapper = {
      _param: this.nativeGain.gain,
      _parent: this,
      get value() {
        return linearGainToDb(this._param.value);
      },
      set value(dbValue) {
        const linearGain = dbToLinearGain(dbValue);
        const now = getNativeContext().currentTime;

        if (!isParamChangeSignificant(this._param.value, linearGain)) return;

        this._param.setValueAtTime(linearGain, now);
      },
    };

    Object.defineProperty(this, 'volume', {
      get: () => this._volumeParamWrapper,
    });
  }

  toDestination() {
    if (this.nativeGain) {
      this.nativeGain.connect(getNativeContext().destination);
    }
    return this;
  }

  connect(target) {
    const destination = target?.input || target?._gainNode || target;
    if (destination && typeof destination.connect === 'function') {
      this.nativeGain.connect(destination);
    } else if (destination) {
      this.nativeGain.connect(destination);
    }
    return target;
  }

  disconnect() {
    this.nativeGain.disconnect();
    return this;
  }

  dispose() {
    this.disconnect();
  }
}

export const createAudioChannel = () => new NativeVolumeAdapter();

export const createAudioAnalyser = () => {
  const ctx = getNativeContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = ANALYSER_SIZE;

  analyser.toDestination = function () {
    return this;
  };
  return analyser;
};
