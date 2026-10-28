import { SOUND_PARAMS } from '../../constants/soundParamsConfig';
import { synthEnginesRegistry } from '../timeline/sync/visualizerState';
import {
  updateInstrumentVolume,
  updateInstrumentPan,
} from './audioModulationActions';

export const dispatchAtomicParameterCommand = (synthName, paramName, value) => {
  const synthInstance = synthEnginesRegistry.current
    ? synthEnginesRegistry.current[synthName]
    : null;

  if (!synthInstance) return;

  const config = SOUND_PARAMS[paramName];
  if (!config) return;

  // 1. Обработка базового объема (Громкости) канала рэка
  if (paramName === 'volume') {
    if (synthInstance.instrument) {
      updateInstrumentVolume(synthInstance.instrument, value);
    }
    return;
  }

  // 2. Обработка стерео-панорамы на нативном StereoPannerNode
  if (paramName === 'pan') {
    if (synthInstance.panner) {
      updateInstrumentPan(synthInstance.panner, value);
    }
    return;
  }

  // 3. Обработка параметров огибающих ADSR через прокси-фасады рэка
  if (config.group === 'envelope') {
    const envelopeState = synthInstance.instrument?.envelope;
    if (envelopeState) {
      if (paramName === 'attack') envelopeState.attackTime = value;
      if (paramName === 'decay') envelopeState.decayTime = value;
      if (paramName === 'sustain') envelopeState.sustainLevel = value;
      if (paramName === 'release') envelopeState.releaseTime = value;
      if (
        paramName === 'synthGlide' &&
        typeof synthInstance.setDetune === 'function'
      ) {
        // Заглушка под glide/portamento, если прокинут через coreAccessors
      }
    }
    return;
  }

  // 4. Обработка фильтров и динамических эффектов рэка (Saturator, Crusher, Distortion и т.д.)
  if (config.isEffect && config.nodeKey) {
    const fxNode = synthInstance[config.nodeKey];
    if (fxNode) {
      // Если параметр текстовый (нотная нотация Delay), маппинг идет на уровне handleChange
      if (config.isTextParam) return;

      if (typeof fxNode.set === 'function' && config.targetParam) {
        fxNode.set({
          [config.targetParam]: value,
        });
      }
    }
  }
};
