import {
  DRUM_EFFECTS_CHAIN,
  EFFECT_DEVICES,
  SYNTH_PRESETS,
} from '../../constants/soundParamsConfig';
import { wrapInstrumentWithEffects } from '../graph/effectsRack';
import { createNativeMonoSynthAdapter } from './synthSynthCore';
import {
  injectSynthMethodsToRackFacade,
  injectRoutingMethodsToRackFacade,
} from './synthEngineFacade';

const createSynth = (synthName) => {
  const presetConfig = SYNTH_PRESETS[synthName] || {};

  console.warn(
    `[🚨 ДЕТЕКТОР КРАША]: Метод createSynth ФИЗИЧЕСКИ ВЫЗВАН для инструмента: "${synthName}"! Пресет громкости: ${presetConfig?.volume}`,
  );
  console.trace();

  const { adapter, state } = createNativeMonoSynthAdapter(presetConfig);

  const rack = wrapInstrumentWithEffects(
    adapter,
    presetConfig,
    DRUM_EFFECTS_CHAIN,
    EFFECT_DEVICES,
  );

  adapter.connectInternal(rack.panner);

  injectSynthMethodsToRackFacade(rack, adapter, state);
  injectRoutingMethodsToRackFacade(rack, adapter, state);

  return rack;
};

export default createSynth;
