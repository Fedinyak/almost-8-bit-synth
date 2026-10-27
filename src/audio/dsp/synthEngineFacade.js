import { executeHardwareDisconnect } from './synthEngineModel';
import {
  canDisconnectFromHardware,
  isValidAdsrParam,
  shouldUpdateActiveAudioHardware,
} from './synthHardware';

/**
 * Проксирует методы управления звуком с внутреннего синтезатора на уровень рэка эффектов
 */
export const injectSynthMethodsToRackFacade = (rack, adapter, state) => {
  rack.oscillatorType = adapter.oscillatorType;
  rack.portamento = adapter.portamento;
  rack.filterEnvelope = adapter.filterEnvelope;
  rack.releaseTime = state.releaseTime;

  rack.getVolume = () => adapter.getVolume();
  rack.setVolume = (val) => adapter.setVolume(val);

  rack.getDetune = () => adapter.getDetune();
  rack.setDetune = (val) => adapter.setDetune(val);

  rack.getFilterQ = () => adapter.getFilterQ();
  rack.setFilterQ = (val) => adapter.setFilterQ(val);

  rack.triggerAttackRelease = (note, dur, time) =>
    adapter.triggerAttackRelease(note, dur, time);

  rack.getAttack = () => state.attackTime;
  rack.setAttack = (val) => {
    if (isValidAdsrParam(val)) state.attackTime = val;
  };

  rack.getDecay = () => state.decayTime;
  rack.setDecay = (val) => {
    if (isValidAdsrParam(val)) state.decayTime = val;
  };

  rack.getSustain = () => state.sustainLevel;
  rack.setSustain = (val) => {
    if (isValidAdsrParam(val)) state.sustainLevel = val;
  };

  rack.getRelease = () => state.releaseTime;
  rack.setRelease = (val) => {
    if (isValidAdsrParam(val)) {
      state.releaseTime = val;
      adapter.releaseTime = val;
    }
  };

  rack.getCutoff = () => state.filterCutoffValue;
  rack.setCutoff = (val) => {
    if (typeof val === 'number' && !isNaN(val)) {
      state.filterCutoffValue = val;
      if (shouldUpdateActiveAudioHardware(state)) {
        state.nativeBiquad.frequency.setValueAtTime(val, state.ctx.currentTime);
      }
    }
  };

  Object.defineProperty(rack, 'volume', {
    get: () => ({
      get value() {
        return adapter.getVolume();
      },
      set value(val) {
        adapter.setVolume(val);
      },
    }),
    configurable: true,
  });

  Object.defineProperty(rack, 'detune', {
    get: () => ({
      get value() {
        return adapter.getDetune();
      },
      set value(val) {
        adapter.setDetune(val);
      },
    }),
    configurable: true,
  });

  Object.defineProperty(rack, 'filter', {
    get: () => ({
      frequency: {
        get value() {
          return rack.getCutoff();
        },
        set value(val) {
          rack.setCutoff(val);
        },
      },
      Q: {
        get value() {
          return rack.getFilterQ();
        },
        set value(val) {
          rack.setFilterQ(val);
        },
      },
    }),
    configurable: true,
  });

  Object.defineProperty(rack, 'envelope', {
    get: () => ({
      get attack() {
        return rack.getAttack();
      },
      set attack(val) {
        rack.setAttack(val);
      },
      get decay() {
        return rack.getDecay();
      },
      set decay(val) {
        rack.setDecay(val);
      },
      get sustain() {
        return rack.getSustain();
      },
      set sustain(val) {
        rack.setSustain(val);
      },
      get release() {
        return rack.getRelease();
      },
      set release(val) {
        rack.setRelease(val);
      },
    }),
    configurable: true,
  });
};

/**
 * Декларативно собирает внешние методы нативной коммутации для рэка канала
 */
export const injectRoutingMethodsToRackFacade = (rack, adapter, state) => {
  rack.connect = (toneNode) => {
    if (toneNode && typeof toneNode.connect === 'function' && rack.output) {
      rack.output.connect(toneNode);
    }
    return rack;
  };

  rack.disconnect = () => {
    if (canDisconnectFromHardware(state)) {
      executeHardwareDisconnect(state);
    }
    if (rack.output) {
      try {
        rack.output.disconnect();
      } catch (e) {}
    }
    return rack;
  };

  rack.dispose = () => {
    rack.disconnect();
    if (typeof adapter.dispose === 'function') {
      adapter.dispose();
    }
  };
};
