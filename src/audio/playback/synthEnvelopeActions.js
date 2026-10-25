import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../core/audioGraphUtils';

const METAL_SYNTH_NAME = 'MetalSynth';
const RAMP_DURATION_SEC = 0.05;

const isMetalSynth = (instrument) => instrument?.name === METAL_SYNTH_NAME;
const hasSustainStage = (envelope) =>
  envelope && envelope.sustain !== undefined;
const isPropertyDifferent = (current, target) => current !== target;

const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

const updateMetalSynthEnvelope = (instrument, attack, decay) => {
  if (typeof instrument.set === 'function') {
    instrument.set({ envelope: { attack, decay } });
    return;
  }

  if (instrument.envelope) {
    updateNodeProperty(instrument.envelope, 'attack', attack);
    updateNodeProperty(instrument.envelope, 'decay', decay);
  }
};

const updateStandardSynthEnvelope = (
  instrument,
  attack,
  decay,
  sustain,
  release,
) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set({ attack, decay, sustain, release });
    return;
  }

  if (instrument.envelope) {
    updateNodeProperty(instrument.envelope, 'attack', attack);
    updateNodeProperty(instrument.envelope, 'decay', decay);
    updateNodeProperty(instrument.envelope, 'sustain', sustain);
    updateNodeProperty(instrument.envelope, 'release', release);
  }
};

const updatePercussiveSynthEnvelope = (instrument, attack, decay, release) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set({ attack, decay, release });
    return;
  }

  if (instrument.envelope) {
    updateNodeProperty(instrument.envelope, 'attack', attack);
    updateNodeProperty(instrument.envelope, 'decay', decay);
    updateNodeProperty(instrument.envelope, 'release', release);
  }
};

export const updateInstrumentEnvelope = (instrument, settings) => {
  if (!instrument) return;

  const attack = settings.attack ?? AUDIO_DEFAULT_ATTACK;
  const decay = settings.decay ?? AUDIO_DEFAULT_DECAY;
  const sustain = settings.sustain ?? AUDIO_DEFAULT_SUSTAIN;
  const release = settings.release ?? AUDIO_DEFAULT_RELEASE;

  if (settings.synthGlide !== undefined && !isMetalSynth(instrument)) {
    updateNodeProperty(instrument, 'portamento', settings.synthGlide);
  }

  if (settings.detune !== undefined && instrument.detune) {
    nativeRampTo(instrument.detune, settings.detune, RAMP_DURATION_SEC);
  }

  if (settings.filterQ !== undefined && instrument.filter) {
    nativeRampTo(instrument.filter.Q, settings.filterQ, RAMP_DURATION_SEC);
  }

  if (settings.filterEnvOctaves !== undefined && instrument.filterEnvelope) {
    updateNodeProperty(
      instrument.filterEnvelope,
      'octaves',
      settings.filterEnvOctaves,
    );
  }

  if (isMetalSynth(instrument)) {
    updateMetalSynthEnvelope(instrument, attack, decay);
    return;
  }

  if (instrument.envelope) {
    if (hasSustainStage(instrument.envelope)) {
      updateStandardSynthEnvelope(instrument, attack, decay, sustain, release);
    } else {
      updatePercussiveSynthEnvelope(instrument, attack, decay, release);
    }
  }
};

export const applySynthEnvelope = (synthInstance, settings) => {
  const nativeInstrument = synthInstance?.instrument;
  if (!nativeInstrument || !settings) return;

  if (settings.pan !== undefined && synthInstance.panner?.pan) {
    nativeRampTo(synthInstance.panner.pan, settings.pan, RAMP_DURATION_SEC);
  }

  if (synthInstance.fxFilter) {
    if (
      settings.filterCutoff !== undefined &&
      synthInstance.fxFilter.frequency
    ) {
      nativeRampTo(
        synthInstance.fxFilter.frequency,
        settings.filterCutoff,
        RAMP_DURATION_SEC,
      );
    }
    if (settings.filterQ !== undefined && synthInstance.fxFilter.Q) {
      nativeRampTo(
        synthInstance.fxFilter.Q,
        settings.filterQ,
        RAMP_DURATION_SEC,
      );
    }
  }

  updateInstrumentEnvelope(nativeInstrument, settings);
};
