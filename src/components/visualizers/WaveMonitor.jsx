import React, { useEffect, useRef } from 'react';
import { synthAnalysers } from '../../utility/visualizerState'; // Импортируем наш изолированный реестр

// === КОНФИГУРАЦИЯ ВИЗУАЛИЗАТОРА ===
const CONFIG = {
  AMPLITUDE_MULTIPLIER: 1, // Чувствительность отображения волны
  TARGET_FPS: 15, // Частота кадров анимации
  CANVAS_WIDTH_PX: 40, // Физическая ширина холста в пикселях
  CANVAS_HEIGHT_PX: 20, // Физическая высота холста в пикселях
  LINE_WIDTH_PX: 1, // Толщина линии осциллографа
  COLOR_ACTIVE: '#00ff00', // Зеленый цвет луча при звуке
  COLOR_SILENT: '#555555', // Серый цвет линии в тишине
  HALF_PIXEL_OFFSET: 0.5, // Сдвиг для точного попадания в пиксельную сетку Canvas
};

// === ВСПОМОГАТЕЛЬНЫЕ ДЕКЛАРАТИВНЫЕ ФУНКЦИИ МАТЕМАТИКИ ===

const clampToAudioBoundaries = (value) => Math.max(-1, Math.min(1, value));

const scaleAmplitude = (value, multiplier) => value * multiplier;

const calculateYCoordinate = (clampedValue, canvasHeight) => {
  return ((clampedValue + 1) / 2) * canvasHeight;
};

const keepInsideCanvasEdges = (yPosition, canvasHeight) => {
  if (yPosition <= 0) return CONFIG.HALF_PIXEL_OFFSET;
  if (yPosition >= canvasHeight) return canvasHeight - CONFIG.HALF_PIXEL_OFFSET;
  return yPosition;
};

const alignToPixelGrid = (yPosition) =>
  Math.round(yPosition) - CONFIG.HALF_PIXEL_OFFSET;

const getFinalYPosition = (rawAudioValue, canvasHeight) => {
  const scaled = scaleAmplitude(rawAudioValue, CONFIG.AMPLITUDE_MULTIPLIER);
  const clamped = clampToAudioBoundaries(scaled);
  const rawY = calculateYCoordinate(clamped, canvasHeight);
  const safeY = keepInsideCanvasEdges(rawY, canvasHeight);
  return alignToPixelGrid(safeY);
};

// === ФУНКЦИИ ОТРИСОВКИ ===

const prepareCanvasContext = (ctx, width, height) => {
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
};

const drawSilentCenterLine = (ctx, width, height) => {
  const middleY = alignToPixelGrid(height / 2);
  ctx.strokeStyle = CONFIG.COLOR_SILENT;
  ctx.lineWidth = CONFIG.LINE_WIDTH_PX;
  ctx.beginPath();
  ctx.moveTo(0, middleY);
  ctx.lineTo(width, middleY);
  ctx.stroke();
};

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

// === ФУНКЦИИ ОРКЕСТРАЦИИ ДАННЫХ И ВРЕМЕНИ ===

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

// ОБНОВЛЕННАЯ ФУНКЦИЯ: Запрашивает живые данные из нашего изолированного кэша вместо глобального window
const fetchAudioDataFromAnalyser = (synthName) => {
  return synthAnalysers[synthName];
};

const drawSceneBasedOnAudioState = (ctx, analyser, width, height) => {
  if (!analyser) {
    drawSilentCenterLine(ctx, width, height);
    return;
  }

  const waveAmplitudes = analyser.getValue();
  drawAudioWaveform(ctx, waveAmplitudes, width, height);
};

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

      const activeAnalyser = fetchAudioDataFromAnalyser(synthName);
      drawSceneBasedOnAudioState(
        ctx,
        activeAnalyser,
        canvas.width,
        canvas.height,
      );
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

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
