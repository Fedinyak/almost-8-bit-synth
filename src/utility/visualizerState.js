export const drumLevels = new Float32Array(8);

// Функция для мгновенного зануления уровней при остановке аудио-движка
export const resetDrumLevels = () => {
  drumLevels.fill(0);
};
