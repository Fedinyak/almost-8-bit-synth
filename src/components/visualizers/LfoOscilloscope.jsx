import React, { useEffect, useRef } from 'react';

export const LfoOscilloscope = ({ depth, waveform, isActive, rate }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Очищаем холст под новую отрисовку
    ctx.clearRect(0, 0, width, height);

    // 1. Рисуем горизонтальную линию нуля по центру
    ctx.beginPath();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // 2. Рассчитываем геометрию волны на основе формы, глубины и СКОРОСТИ (rate)
    const maxAmplitude = centerY * 0.8;
    const currentAmplitude = depth * maxAmplitude;

    // Коэффициент масштабирования частоты, чтобы забор из волн на 20 Гц не сливался в кашу
    const frequencyScale = 0.4;
    const totalCycles = rate * frequencyScale;

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isActive ? '#00ff00' : '#666666';

    let lastY = centerY;

    for (let x = 0; x < width; x++) {
      // Рассчитываем угол с учетом количества циклов (totalCycles), помещающихся на ширину экрана
      const angle = (x / width) * 2 * Math.PI * totalCycles;
      let yOffset = 0;

      // Нормализуем угол в диапазон от 0 до 2*PI для правильного расчета пилы, квадрата и треугольника
      const normalizedAngle = angle % (2 * Math.PI);

      switch (waveform) {
        case 'sine':
          // Классический синус: стартует из нуля вверх, затем уходит в минус
          yOffset = Math.sin(angle);
          break;

        case 'square':
          // Классический квадрат: первая половина периода вверху (+1), вторая — внизу (-1)
          yOffset = normalizedAngle < Math.PI ? 1 : -1;
          break;

        case 'sawtooth':
          // КЛАССИЧЕСКАЯ ВОСХОДЯЩАЯ ПИЛА (SAWTOOTH): Плавный взлет от -1 до +1
          // При прохождении фазы она честно зеркалится по вертикали
          yOffset = normalizedAngle / Math.PI - 1;
          break;

        case 'triangle':
          // КЛАССИЧЕСКИЙ ТРЕУГОЛЬНИК (TRIANGLE): Стартует из нуля, плавно идет вверх до +1 к четверти периода,
          // падает до -1 к трем четвертям периода и возвращается в ноль. Полная симметрия фазы.
          if (normalizedAngle < Math.PI * 0.5) {
            yOffset = normalizedAngle / (Math.PI * 0.5);
          } else if (normalizedAngle < Math.PI * 1.5) {
            yOffset = 2 - normalizedAngle / (Math.PI * 0.5);
          } else {
            yOffset = -4 + normalizedAngle / (Math.PI * 0.5);
          }
          break;

        default:
          yOffset = 0;
      }

      const y = centerY - yOffset * currentAmplitude;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        // Отрисовка вертикальных идеальных срезов для КВАДРАТНОЙ и ПИЛООБРАЗНОЙ волны на стыках фаз
        if (waveform === 'square' || waveform === 'sawtooth') {
          const prevAngle = ((x - 1) / width) * 2 * Math.PI * totalCycles;
          const prevNormalizedAngle = prevAngle % (2 * Math.PI);

          if (waveform === 'square') {
            const currentSign = yOffset >= 0;
            const prevSign = prevNormalizedAngle < Math.PI;
            if (currentSign !== prevSign) {
              ctx.lineTo(x, lastY);
            }
          } else if (waveform === 'sawtooth') {
            // Вертикальный сброс пилы в конце каждого полного периода
            if (normalizedAngle < prevNormalizedAngle) {
              ctx.lineTo(x, lastY);
            }
          }
        }
        ctx.lineTo(x, y);
      }

      lastY = y;
    }

    ctx.stroke();
  }, [depth, waveform, isActive, rate]);

  return (
    <canvas
      ref={canvasRef}
      width="200"
      height="100"
      className="lfo-static-oscilloscope"
    />
  );
};

export default LfoOscilloscope;
