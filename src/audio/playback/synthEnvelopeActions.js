import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../core/audioGraphUtils';
import {
  isMetalSynth,
  canApplyPan,
  canApplyFilterCutoff,
  canApplyRackFilterQ,
} from './synthEnvelopeGuards';
import { updateMetalSynthEnvelope } from './synthEnvelopeMutators';
import {
  SYNTH_PARAMETER_PIPELINE,
  applySynthEnvelopeTypeCommand,
} from './synthParameterPipeline';

const RAMP_DURATION_SEC = 0.05;

export const updateInstrumentEnvelope = (instrument, settings) => {
  if (!instrument) return;

  const envelopeValues = {
    attack: settings.attack ?? AUDIO_DEFAULT_ATTACK,
    decay: settings.decay ?? AUDIO_DEFAULT_DECAY,
    sustain: settings.sustain ?? AUDIO_DEFAULT_SUSTAIN,
    release: settings.release ?? AUDIO_DEFAULT_RELEASE,
  };

  for (const applyCommand of SYNTH_PARAMETER_PIPELINE) {
    applyCommand(instrument, settings);
  }

  if (isMetalSynth(instrument)) {
    updateMetalSynthEnvelope(instrument, envelopeValues);
    return;
  }

  applySynthEnvelopeTypeCommand(instrument, envelopeValues);
};

export const applySynthEnvelope = (synthInstance, settings) => {
  const nativeInstrument = synthInstance?.instrument;
  if (!nativeInstrument || !settings) return;

  if (canApplyPan(synthInstance, settings.pan)) {
    nativeRampTo(synthInstance.panner.pan, settings.pan, RAMP_DURATION_SEC);
  }

  if (canApplyFilterCutoff(synthInstance, settings.filterCutoff)) {
    nativeRampTo(
      synthInstance.fxFilter.frequency,
      settings.filterCutoff,
      RAMP_DURATION_SEC,
    );
  }

  if (canApplyRackFilterQ(synthInstance, settings.filterQ)) {
    nativeRampTo(synthInstance.fxFilter.Q, settings.filterQ, RAMP_DURATION_SEC);
  }

  updateInstrumentEnvelope(nativeInstrument, settings);
};
