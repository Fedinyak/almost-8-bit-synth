import React, { useEffect, useRef } from 'react';
import { drumLevels } from '../../audio/sync/visualizerState'; // Импортируем нашу изолированную линейную память

// === КОНФИГУРАЦИЯ ВИЗУАЛИЗАТОРА ===
const CONFIG = {
  TARGET_FPS: 15, // Фиксированная частота кадров
  CANVAS_WIDTH_PX: 100, // Физическая ширина холста в пикселях
  CANVAS_HEIGHT_PX: 30, // Физическая высота холста в пикселях
  COLOR_ACTIVE: '#00ff00', // Зеленый цвет прыгающей полоски
  BAR_SPACING_PX: 2, // Расстояние между полосками барабанов
  HALF_PIXEL_OFFSET: 0.5, // Сдвиг для точного попадания в пиксельную сетку Canvas

  // === РУЧКА ПЕРЕКЛЮЧЕНИЯ РЕЖИМА ОТРЕСОВКИ ===
  // Доступные варианты:
  // 'FULL'     - классический заполненный прямоугольник, растущий снизу вверх
  // 'TOP_ONLY' - прыгает только верхняя грань (контур/черточка)
  RENDER_MODE: 'TOP_ONLY',

  TOP_LINE_HEIGHT_PX: 1, // Толщина верхней черточки в пикселях (применяется для 'TOP_ONLY')
};

// Индивидуальные коэффициенты затухания на каждый кадр для каждого барабана
const DRUM_DECAY_RATES = [
  0.25, // 0: kick (быстрый спад)
  0.2, // 1: snare (средний спад)
  0.3, // 2: hiHat (очень быстрый спад)
  0.3, // 3: hiHatClose (очень быстрый спад)
  0.15, // 4: hiHatOpen (чуть длиннее)
  0.03, // 5: crash (очень медленный спад, симулирует длинный хвост 1.5с)
  0.06, // 6: ride (длинный хвост)
  0.18, // 7: tom (средний спад)
];

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

const prepareCanvasContext = (ctx, width, height) => {
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
};

const shouldRenderNextFrame = (
  currentTimestamp,
  lastDrawTimestamp,
  millisecondsPerFrame,
) => {
  const timeElapsedSinceLastDraw = currentTimestamp - lastDrawTimestamp;
  return timeElapsedSinceLastDraw >= millisecondsPerFrame;
};

const calculateAlignedTimestamp = (
  currentTimestamp,
  lastDrawTimestamp,
  millisecondsPerFrame,
) => {
  const timeElapsedSinceLastDraw = currentTimestamp - lastDrawTimestamp;
  return currentTimestamp - (timeElapsedSinceLastDraw % millisecondsPerFrame);
};

const drawDrumBars = (ctx, width, height) => {
  const totalBars = 8;
  const totalSpacingSpace = CONFIG.BAR_SPACING_PX * (totalBars - 1);
  const barWidth = Math.floor((width - totalSpacingSpace) / totalBars);

  ctx.fillStyle = CONFIG.COLOR_ACTIVE;

  for (let i = 0; i < totalBars; i++) {
    let currentLevel = drumLevels[i]; // Читаем напрямую из быстрого Shared-массива

    if (currentLevel > 0) {
      currentLevel -= DRUM_DECAY_RATES[i];
      if (currentLevel < 0) currentLevel = 0;
      drumLevels[i] = currentLevel; // Записываем измененный уровень обратно в память
    }

    const barHeight = Math.round(currentLevel * height);

    if (barHeight > 0) {
      const xPosition =
        Math.floor(i * (barWidth + CONFIG.BAR_SPACING_PX)) +
        CONFIG.HALF_PIXEL_OFFSET;
      const yPosition = height - barHeight;

      // Переключатель логики рендеринга на основе константы
      if (CONFIG.RENDER_MODE === 'TOP_ONLY') {
        // Рисуем только верхнюю черточку заданной толщины
        ctx.fillRect(xPosition, yPosition, barWidth, CONFIG.TOP_LINE_HEIGHT_PX);
      } else {
        // По умолчанию ('FULL') — классический заполненный прямоугольник до самого низа экрана
        ctx.fillRect(xPosition, yPosition, barWidth, barHeight);
      }
    }
  }
};

const DrumMonitor = () => {
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const lastDrawTimestampRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const millisecondsPerFrame = 1000 / CONFIG.TARGET_FPS;

    const renderLoop = (currentTimestamp) => {
      animationFrameIdRef.current = requestAnimationFrame(renderLoop);

      if (
        !shouldRenderNextFrame(
          currentTimestamp,
          lastDrawTimestampRef.current,
          millisecondsPerFrame,
        )
      ) {
        return;
      }
      lastDrawTimestampRef.current = calculateAlignedTimestamp(
        currentTimestamp,
        lastDrawTimestampRef.current,
        millisecondsPerFrame,
      );

      prepareCanvasContext(ctx, canvas.width, canvas.height);
      drawDrumBars(ctx, canvas.width, canvas.height);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CONFIG.CANVAS_WIDTH_PX}
      height={CONFIG.CANVAS_HEIGHT_PX}
      style={{
        background: 'transparent',
        display: 'inline-block',
        verticalAlign: 'middle',
        imageRendering: 'pixelated',
      }}
    />
  );
};

export default DrumMonitor;
