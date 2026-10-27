import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../dsp/audioGraphUtils';
import {
  canApplyPan,
  canApplyFilterCutoff,
  canApplyRackFilterQ,
} from './synthEnvelopeGuards';

const RAMP_DURATION_SEC = 0.05;

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ ---
const isMissing = (target) => !target;

export const updateInstrumentEnvelope = (instrumentInstance, settings) => {
  if (
    isMissing(instrumentInstance) ||
    isMissing(instrumentInstance.envelopeValues)
  )
    return;

  // Декларативно пушим секунды из Redux напрямую в общие параметры рэка (DRY для синтов и барабанов)
  instrumentInstance.envelopeValues.attack =
    settings.attack ?? AUDIO_DEFAULT_ATTACK;
  instrumentInstance.envelopeValues.decay =
    settings.decay ?? AUDIO_DEFAULT_DECAY;
  instrumentInstance.envelopeValues.sustain =
    settings.sustain ?? AUDIO_DEFAULT_SUSTAIN;
  instrumentInstance.envelopeValues.release =
    settings.release ?? AUDIO_DEFAULT_RELEASE;
};

export const applySynthEnvelope = (synthInstance, settings) => {
  if (isMissing(synthInstance) || isMissing(settings)) return;

  if (canApplyPan(synthInstance, settings.pan)) {
    nativeRampTo(synthInstance.panner.pan, settings.pan, RAMP_DURATION_SEC);
  }

  if (canApplyFilterCutoff(synthInstance, settings.filterCutoff)) {
    nativeRampTo(
      synthInstance.fxFilter?.frequency ||
        synthInstance.nativeBiquad?.frequency,
      settings.filterCutoff,
      RAMP_DURATION_SEC,
    );
  }

  if (canApplyRackFilterQ(synthInstance, settings.filterQ)) {
    nativeRampTo(
      synthInstance.fxFilter?.Q || synthInstance.nativeBiquad?.Q,
      settings.filterQ,
      RAMP_DURATION_SEC,
    );
  }

  // Обновляем огибающую рэка (работает полиморфно для любого инструмента)
  updateInstrumentEnvelope(synthInstance, settings);
};
