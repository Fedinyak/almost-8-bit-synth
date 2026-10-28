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

  // ============================================================================
  // ЖЕСТКИЙ АУДИТОР ПЕРЕСОЗДАНИЯ АУДИО-ГРАФА (ЖИВОЙ ТРЕЙСИНГ ЯДРА)
  // ============================================================================
  console.group(
    `%c[🚨 АЛАРМ — КРАШ СИГНАЛЬНОГО ТРАКТА]: ПЕРЕПИСЫВАНИЕ ЧИПА "${synthName}"`,
    'color: red; font-weight: bold;',
  );
  console.warn(
    `[КОРЕНЬ ЛАГА]: Звуковой движок ФИЗИЧЕСКИ ВЫЗВАЛ createSynth для инструмента: "${synthName}"!`,
  );
  console.log(
    `[ДАННЫЕ]: Текущий пресет громкости инструмента: ${presetConfig?.volume} дБ`,
  );
  console.log(
    '%c[СТЭК ВЫЗОВОВ]: Смотри ниже, какой именно React-компонент или хук уничтожил старый синт и вызвал эту сборку:',
    'color: #999; font-style: italic;',
  );
  console.trace();
  console.groupEnd();

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
