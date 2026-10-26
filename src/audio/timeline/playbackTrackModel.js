const isMeasureEmpty = (patternsMap, measureIndex) =>
  !patternsMap[measureIndex];

const isStepEmpty = (patternsMap, measureIndex, stepIndex) =>
  !patternsMap[measureIndex][stepIndex];

const initializeMeasureStructure = (patternsMap, measureIndex) => {
  if (isMeasureEmpty(patternsMap, measureIndex)) {
    patternsMap[measureIndex] = {};
  }
};

const initializeStepStructure = (patternsMap, measureIndex, stepIndex) => {
  if (isStepEmpty(patternsMap, measureIndex, stepIndex)) {
    patternsMap[measureIndex][stepIndex] = [];
  }
};

const createStepEventContainer = (patternsMap, measureIndex, stepIndex) => {
  initializeMeasureStructure(patternsMap, measureIndex);
  initializeStepStructure(patternsMap, measureIndex, stepIndex);
};

/**
 * Безопасно записывает событие во вложенную структуру матрицы паттернов
 */
export const writeEventToMatrix = (
  patternsMap,
  measureIndex,
  stepIndex,
  eventData,
) => {
  createStepEventContainer(patternsMap, measureIndex, stepIndex);
  patternsMap[measureIndex][stepIndex].push(eventData);
};

/**
 * Безопасно извлекает данные ячейки шага из матрицы паттернов
 */
export const readEventFromMatrix = (patternsMap, measureIndex, stepIndex) => {
  if (isMeasureEmpty(patternsMap, measureIndex)) return null;
  return patternsMap[measureIndex][stepIndex] || null;
};
