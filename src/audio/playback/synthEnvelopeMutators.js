import { isPropertyDifferent } from './synthEnvelopeGuards';

const ADSR_PROPERTIES = ['attack', 'decay', 'sustain', 'release'];
const ASR_PROPERTIES = ['attack', 'decay', 'release'];
const METAL_PROPERTIES = ['attack', 'decay'];

export const updateNodeProperty = (node, key, targetValue) => {
  if (node && isPropertyDifferent(node[key], targetValue)) {
    node[key] = targetValue;
  }
};

const applyEnvelopeProperties = (envelope, propertyList, valuesMap) => {
  for (const property of propertyList) {
    if (valuesMap[property] !== undefined) {
      updateNodeProperty(envelope, property, valuesMap[property]);
    }
  }
};

export const updateMetalSynthEnvelope = (instrument, valuesMap) => {
  if (typeof instrument.set === 'function') {
    instrument.set({
      envelope: { attack: valuesMap.attack, decay: valuesMap.decay },
    });
    return;
  }

  if (instrument.envelope) {
    applyEnvelopeProperties(instrument.envelope, METAL_PROPERTIES, valuesMap);
  }
};

export const updateStandardSynthEnvelope = (instrument, valuesMap) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set(valuesMap);
    return;
  }

  if (instrument.envelope) {
    applyEnvelopeProperties(instrument.envelope, ADSR_PROPERTIES, valuesMap);
  }
};

export const updatePercussiveSynthEnvelope = (instrument, valuesMap) => {
  if (instrument.envelope?.set) {
    instrument.envelope.set({
      attack: valuesMap.attack,
      decay: valuesMap.decay,
      release: valuesMap.release,
    });
    return;
  }

  if (instrument.envelope) {
    applyEnvelopeProperties(instrument.envelope, ASR_PROPERTIES, valuesMap);
  }
};
