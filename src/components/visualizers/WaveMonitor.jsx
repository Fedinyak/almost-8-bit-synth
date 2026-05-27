import React, { useEffect, useRef } from 'react';

// === КОНФИГУРАЦИЯ ВИЗУАЛИЗАТОРА ===
const CONFIG = {
  AMPLITUDE_MULTIPLIER: 1, // Чувствительность отображения волны
  TARGET_FPS: 15, // Частота кадров анимации
  CANVAS_WIDTH_PX: 40, // Физическая ширина холста в пикселях
  CANVAS_HEIGHT_PX: 20, // Физическая высота холста в пикселях
  LINE_WIDTH_PX: 1, // Толщина линии осциллографа
  COLOR_ACTIVE: '#00ff00', // Зеленый цвет луха при звуке
  COLOR_SILENT: '#555555', // Серый цвет линии в тишине
  HALF_PIXEL_OFFSET: 0.5, // Сдвиг для точного попадания в пиксельную сетку Canvas
};

// === ВСПОМОГАТЕЛЬНЫЕ ДЕКЛАРАТИВНЫЕ ФУНКЦИИ ===

// Ограничивает значение в диапазоне от -1 до 1
const clampToAudioBoundaries = (value) => Math.max(-1, Math.min(1, value));

// Масштабирует амплитуду сигнала с учетом множителя чувствительности
const scaleAmplitude = (value, multiplier) => value * multiplier;

// Переводит нормализованное аудио-значение в координату Y на холсте
const calculateYCoordinate = (clampedValue, canvasHeight) => {
  return ((clampedValue + 1) / 2) * canvasHeight;
};

// Предотвращает обрезание пикселей линии на краях рамки холста
const keepInsideCanvasEdges = (yPosition, canvasHeight) => {
  if (yPosition <= 0) return CONFIG.HALF_PIXEL_OFFSET;
  if (yPosition >= canvasHeight) return canvasHeight - CONFIG.HALF_PIXEL_OFFSET;
  return yPosition;
};

// Округляет координату и смещает ее на полпикселя для идеальной резкости без размытия
const alignToPixelGrid = (yPosition) =>
  Math.round(yPosition) - CONFIG.HALF_PIXEL_OFFSET;

// Финальный пайплайн расчета координаты Y для одной точки волны
const getFinalYPosition = (rawAudioValue, canvasHeight) => {
  const scaled = scaleAmplitude(rawAudioValue, CONFIG.AMPLITUDE_MULTIPLIER);
  const clamped = clampToAudioBoundaries(scaled);
  const rawY = calculateYCoordinate(clamped, canvasHeight);
  const safeY = keepInsideCanvasEdges(rawY, canvasHeight);
  return alignToPixelGrid(safeY);
};

// Рисует горизонтальную прямую линию по центру (режим тишины)
const drawSilentCenterLine = (ctx, width, height) => {
  const middleY = alignToPixelGrid(height / 2);
  ctx.strokeStyle = CONFIG.COLOR_SILENT;
  ctx.lineWidth = CONFIG.LINE_WIDTH_PX;
  ctx.beginPath();
  ctx.moveTo(0, middleY);
  ctx.lineTo(width, middleY);
  ctx.stroke();
};

// Отрисовывает динамическую волну на основе массива аудиоданных
const drawAudioWaveform = (ctx, audioValues, width, height) => {
  ctx.strokeStyle = CONFIG.COLOR_ACTIVE;
  ctx.lineWidth = CONFIG.LINE_WIDTH_PX;
  ctx.beginPath();

  const stepWidth = width / audioValues.length;
  let currentX = 0;

  for (let i = 0; i < audioValues.length; i++) {
    const targetY = getFinalYPosition(audioValues[i], height);

    if (i === 0) {
      ctx.moveTo(currentX, targetY);
    } else {
      ctx.lineTo(currentX, targetY);
    }

    currentX += stepWidth;
  }

  ctx.stroke();
};

// === ГЛАВНЫЙ КОМПОНЕНТ ===
const WaveMonitor = ({ synthName }) => {
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

      // Контроль частоты кадров (FPS Limit)
      const timeElapsedSinceLastDraw =
        currentTimestamp - lastDrawTimestampRef.current;
      if (timeElapsedSinceLastDraw < millisecondsPerFrame) return;

      // Выравниваем шаг таймера
      lastDrawTimestampRef.current =
        currentTimestamp - (timeElapsedSinceLastDraw % millisecondsPerFrame);

      // Получаем инстанс анализатора из глобального реестра
      const activeAnalyser = window.__synthAnalysers?.[synthName];

      // Очищаем прозрачный холст перед каждым кадром
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      if (!activeAnalyser) {
        drawSilentCenterLine(ctx, canvas.width, canvas.height);
        return;
      }

      const waveAmplitudes = activeAnalyser.getValue();
      drawAudioWaveform(ctx, waveAmplitudes, canvas.width, canvas.height);
    };

    // Запуск цикла анимации
    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    // Очистка при размонтировании
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [synthName]);

  return (
    <canvas
      ref={canvasRef}
      width={CONFIG.CANVAS_WIDTH_PX}
      height={CONFIG.CANVAS_HEIGHT_PX}
      style={{
        background: 'transparent',
        display: 'inline-block',
        verticalAlign: 'middle',
        marginLeft: '8px',
        imageRendering: 'pixelated',
      }}
    />
  );
};

export default WaveMonitor;
