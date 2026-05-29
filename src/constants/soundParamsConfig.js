export const SOUND_PARAMS = {
  attack: {
    min: 0.005,
    max: 2.0,
    step: 0.005,
    default: 0.005,
    label: 'ATTACK',
    // Обычный параметр огибающей, флага эффекта нет
  },
  bitcrusherWet: {
    min: 0.0,
    max: 1.0,
    step: 0.05,
    default: 0.0,
    label: 'CRUSHER MIX',
    isEffect: true, // Маркер для автоматического байпаса в хуке
    nodeKey: 'fxBitcrusher', // Имя свойства внутри нашего объекта-контейнера синта
    bypassValue: 0.0, // Точка, при которой эффект полностью выключается в процессоре
  },
};
