// Память для визуалайзера барабанов
export const drumLevels = new Float32Array(8);

// НОВЫЙ РЕЕСТР: Изолированная память для хранения объектов Tone.Analyser
export const synthAnalysers = {};

export const resetDrumLevels = () => {
  drumLevels.fill(0);
};

// НОВАЯ ФУНКЦИЯ: Безопасная очистка анализаторов при анмаунте приложения
export const resetSynthAnalysers = () => {
  Object.keys(synthAnalysers).forEach((key) => {
    delete synthAnalysers[key];
  });
};
