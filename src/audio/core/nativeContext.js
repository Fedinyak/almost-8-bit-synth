let rawContext = null;

export const getNativeContext = () => {
  if (!rawContext) {
    // Создаем системный контекст браузера один раз по требованию
    rawContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return rawContext;
};
