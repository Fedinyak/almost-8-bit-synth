export const drumLevels = new Float32Array(8);
export const synthAnalysers = {};

export const synthEnginesRegistry = { current: null };

export const resetDrumLevels = () => drumLevels.fill(0);
export const resetSynthAnalysers = () => {
  Object.keys(synthAnalysers).forEach((key) => delete synthAnalysers[key]);
};
