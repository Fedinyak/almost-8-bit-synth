import { executeHardwareDisconnect } from './drumEngineModel';
import { canDisconnectFromHardware } from './drumHardware';

/**
 * Проксирует методы управления звуком с внутреннего синтезатора на уровень рэка эффектов
 */
export const injectSynthMethodsToRackFacade = (rack, adapter) => {
  rack.drumName = adapter.drumName;
  rack.typeString = adapter.typeString;
  rack.envelope = adapter.envelope;
  rack.getVolume = () => adapter.getVolume();
  rack.setVolume = (val) => adapter.setVolume(val);
  rack.triggerAttackRelease = (note, dur, time) =>
    adapter.triggerAttackRelease(note, dur, time);
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
