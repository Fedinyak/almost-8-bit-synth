import { nativeRampTo } from '../core/audioGraphUtils';
import {
  canApplyPortamento,
  canApplyDetune,
  canApplyFilterQ,
  canApplyFilterOctaves,
  hasSustainStage,
} from './synthEnvelopeGuards';
import {
  updateNodeProperty,
  updateStandardSynthEnvelope,
  updatePercussiveSynthEnvelope,
} from './synthEnvelopeMutators';

const PORTAMENTO_KEY = 'portamento';
const OCTAVES_KEY = 'octaves';
const RAMP_DURATION_SEC = 0.05;

const applyPortamentoCommand = (instrument, settings) => {
  if (canApplyPortamento(instrument, settings.synthGlide)) {
    updateNodeProperty(instrument, PORTAMENTO_KEY, settings.synthGlide);
  }
};

const applyDetuneCommand = (instrument, settings) => {
  if (canApplyDetune(instrument, settings.detune)) {
    nativeRampTo(instrument.detune, settings.detune, RAMP_DURATION_SEC);
  }
};

const applyFilterQCommand = (instrument, settings) => {
  if (canApplyFilterQ(instrument, settings.filterQ)) {
    nativeRampTo(instrument.filter.Q, settings.filterQ, RAMP_DURATION_SEC);
  }
};

const applyFilterOctavesCommand = (instrument, settings) => {
  if (canApplyFilterOctaves(instrument, settings.filterEnvOctaves)) {
    updateNodeProperty(instrument, OCTAVES_KEY, settings.filterEnvOctaves);
  }
};

export const applySynthEnvelopeTypeCommand = (instrument, envelopeValues) => {
  if (!instrument.envelope) return;

  if (hasSustainStage(instrument.envelope)) {
    updateStandardSynthEnvelope(instrument, envelopeValues);
    return;
  }

  updatePercussiveSynthEnvelope(instrument, envelopeValues);
};

export const SYNTH_PARAMETER_PIPELINE = [
  applyPortamentoCommand,
  applyDetuneCommand,
  applyFilterQCommand,
  applyFilterOctavesCommand,
];
