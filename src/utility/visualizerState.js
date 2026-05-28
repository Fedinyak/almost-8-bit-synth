export const drumLevels = new Float32Array(8);
export const synthAnalysers = {};

// НОВЫЙ РЕЕСТР: Сюда мы сохраним ссылки на движки синтов для прямого управления
export const synthEnginesRegistry = { current: null };

export const resetDrumLevels = () => drumLevels.fill(0);
export const resetSynthAnalysers = () => {
  Object.keys(synthAnalysers).forEach((key) => delete synthAnalysers[key]);
};
