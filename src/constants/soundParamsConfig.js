export const SOUND_PARAM_GROUPS = [
  { key: 'envelope', label: 'ENVELOPE:' },
  { key: 'effects', label: 'EFFECTS:' },
];

export const SOUND_PARAMS = {
  attack: {
    min: 0.005,
    max: 2.0,
    step: 0.005,
    default: 0.005,
    label: 'ATTACK',
    group: 'envelope',
  },
  release: {
    min: 0.01,
    max: 3.0,
    step: 0.01,
    default: 0.3, // 300 миллисекунд по умолчанию
    label: 'RELEASE',
    group: 'envelope',
  },

  bitcrusherWet: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.0,
    label: 'CRUSHER MIX',
    isEffect: true,
    nodeKey: 'fxBitcrusher',
    bypassValue: 0.0,
    group: 'effects',
  },

  delayWet: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.0,
    label: 'DELAY MIX',
    isEffect: true,
    nodeKey: 'fxDelay',
    bypassValue: 0.0,
    group: 'effects',
  },
};
