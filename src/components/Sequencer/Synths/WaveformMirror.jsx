import React, { useEffect, useRef } from 'react';

export const WaveformMirror = ({
  synthName,
  activeParamGroup,
  instrumentSettings,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const renderWidth = width - padding * 2;
    const renderHeight = height - padding * 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // 1. ВЫТАСКИВАЕМ ВСЕ ПАРАМЕТРЫ ИЗ REDUX (включая новые ручки)
    const crusherWet = instrumentSettings?.bitcrusherWet ?? 0;
    const crusherBits = instrumentSettings?.bitcrusherBits ?? 4; // 🆕 Считываем ручку BITS (дефолт 4)

    const distortionWet = instrumentSettings?.distortionWet ?? 0;
    const distortionDrive = instrumentSettings?.distortionDrive ?? 1.5; // 🆕 Считываем ручку DRIVE (дефолт 1.5)

    const cutoffHz = instrumentSettings?.filterCutoff ?? 10000;
    const filterQ = instrumentSettings?.filterQ ?? 1;
    const filterEnvOctaves = instrumentSettings?.filterEnvOctaves ?? 0;

    // 2. ГЕНЕРАТОР БАЗОВОЙ ВОЛНЫ
    const pointsCount = 200;
    const oscillatorType = instrumentSettings?.oscillatorType || 'square';
    let wavePoints = [];

    const envPhaseMod = 1 + filterEnvOctaves * 0.5;

    for (let i = 0; i < pointsCount; i++) {
      const x = padding + (i / pointsCount) * renderWidth;
      const progress = (i / pointsCount) * envPhaseMod;
      let y = 0;

      if (oscillatorType === 'sine' || oscillatorType === 'MembraneSynth') {
        y = Math.sin(progress * Math.PI * 4);
      } else if (oscillatorType === 'square') {
        y = Math.sin(progress * Math.PI * 4) >= 0 ? 1 : -1;
      } else if (oscillatorType === 'sawtooth') {
        y = 1 - ((progress * 4) % 2);
      } else if (oscillatorType === 'triangle') {
        y = Math.abs(1 - ((progress * 4) % 2)) * 2 - 1;
      } else if (
        oscillatorType === 'NoiseSynth' ||
        oscillatorType === 'MetalSynth'
      ) {
        y = Math.random() * 2 - 1;
      }

      wavePoints.push({ x, y });
    }

    // 3. СКВОЗНОЙ КОНВЕЙЕР ДЕФОРМАЦИИ

    // --- Шаг А: Биткрашер (Квантование на основе ручки BITS) ---
    if (crusherWet > 0) {
      // 🆕 Вместо слепой математики завязываемся на реальное положение ручки CRUSHER BITS
      // Чем меньше бит выставлено на панели — тем меньше ступенек на графике (минимум 2)
      const steps = Math.max(2, Math.round(Math.pow(2, crusherBits)));
      wavePoints = wavePoints.map((p) => {
        const steppedY = Math.round(p.y * steps) / steps;
        return { x: p.x, y: p.y * (1 - crusherWet) + steppedY * crusherWet };
      });
    }

    // --- Шаг Б: Дисторшн (Hard Clipping на основе ручки DRIVE) ---
    if (distortionWet > 0) {
      // 🆕 Уровень среза теперь динамически зависит от DISTORTION DRIVE
      // Чем выше драйв — тем сильнее распирает сигнал и сильнее срезаются пики
      const limit = Math.max(0.1, 1 / (1 + distortionDrive * 2));
      wavePoints = wavePoints.map((p) => {
        // Усиливаем амплитуду волны драйвом и жестко зажимаем в рамки лимита
        const boostedY = p.y * (1 + distortionDrive * 3);
        const clippedY = Math.min(limit, Math.max(-limit, boostedY));

        // Масштабируем обратно к размерам холста и подмешиваем по Wet
        const finalY = clippedY * (1 / limit);
        return {
          x: p.x,
          y: p.y * (1 - distortionWet) + finalY * distortionWet,
        };
      });
    }

    // --- Шаг В: Фильтр ---
    if (cutoffHz < 9500 || filterQ > 1) {
      const smoothness = Math.max(1, Math.round((10000 - cutoffHz) / 400));
      const qBoost = (filterQ - 1) * 0.15;

      let smoothedPoints = [];
      for (let i = 0; i < wavePoints.length; i++) {
        let sumY = 0;
        let count = 0;
        for (let j = -smoothness; j <= smoothness; j++) {
          if (wavePoints[i + j]) {
            sumY += wavePoints[i + j].y;
            count++;
          }
        }
        let targetY = sumY / count;
        if (filterQ > 1) {
          const diff = wavePoints[i].y - targetY;
          targetY += diff * qBoost;
        }
        smoothedPoints.push({ x: wavePoints[i].x, y: targetY });
      }
      wavePoints = smoothedPoints;
    }

    // 4. ОТРИСОВКА ОДНОЙ СТАБИЛЬНОЙ ЗЕЛИНОЙ ВОЛНЫ
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00ffaa';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    wavePoints.forEach((p, idx) => {
      const pixelY = centerY - (p.y * renderHeight) / 2;
      if (idx === 0) ctx.moveTo(p.x, pixelY);
      else ctx.lineTo(p.x, pixelY);
    });
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, [synthName, instrumentSettings]);

  return (
    <div
      style={{
        display: 'inline-block',
        background: '#111',
        padding: '4px',
        borderRadius: '6px',
      }}
    >
      <canvas
        ref={canvasRef}
        width={200}
        height={100}
        style={{ display: 'block', borderRadius: '4px' }}
      />
    </div>
  );
};

export default WaveformMirror;
