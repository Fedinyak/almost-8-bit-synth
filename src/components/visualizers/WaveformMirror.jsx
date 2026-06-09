import React, { useEffect, useRef } from 'react';
// 🆕 ИМПОРТИРУЕМ ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ ЦЕПОЧКИ ЭФФЕКТОВ:
import { DRUM_EFFECTS_CHAIN } from '../../constants/soundParamsConfig';

// ============================================================================
// 1. ДЕКЛАРАТИВНЫЙ СЛОВАРЬ МАТЕМАТИЧЕСКИХ ТРАНСФОРМАЦИЙ ВОЛНЫ
// ============================================================================
const EFFECT_TRANSFORMERS = {
  crusher: (points, settings) => {
    // 🆕 ЧЕСТНАЯ ПРОВЕРКА КНОПКИ: Если крашер выключен кнопкой, пропускаем деформацию
    const isActive = settings?.bitcrusherActive ?? true;
    const wet = settings?.bitcrusherWet ?? 0;
    if (!isActive || wet <= 0) return points;

    const bits = settings?.bitcrusherBits ?? 4;
    // Квантование на основе ручки BITS
    const steps = Math.max(2, Math.round(Math.pow(2, bits)));

    return points.map((p) => {
      const steppedY = Math.round(p.y * steps) / steps;
      return {
        ...p,
        y: p.y * (1 - wet) + steppedY * wet,
      };
    });
  },

  distortion: (points, settings) => {
    // 🆕 ЧЕСТНАЯ ПРОВЕРКА КНОПКИ: Если дисторшн выключен кнопкой, пропускаем деформацию
    const isActive = settings?.distortionActive ?? true;
    const wet = settings?.distortionWet ?? 0;
    if (!isActive || wet <= 0) return points;

    const drive = settings?.distortionDrive ?? 1.5;
    // Уровень среза динамически зависит от DISTORTION DRIVE
    const limit = Math.max(0.1, 1 / (1 + drive * 2));

    return points.map((p) => {
      const boostedY = p.y * (1 + drive * 3);
      const clippedY = Math.min(limit, Math.max(-limit, boostedY));
      const finalY = clippedY * (1 / limit);

      return {
        ...p,
        y: p.y * (1 - wet) + finalY * wet,
      };
    });
  },

  filter: (points, settings) => {
    // ПОЧИНЕНО: Подвязываемся под новое имя ручки из паспорта параметров
    const cutoffHz = settings?.filterLowpassCutoff ?? 10000;
    const filterQ = settings?.filterQ ?? 1;

    if (cutoffHz >= 9500 && filterQ <= 1) return points;

    const smoothness = Math.max(1, Math.round((10000 - cutoffHz) / 400));
    const qBoost = (filterQ - 1) * 0.15;

    const smoothedPoints = [];
    for (let i = 0; i < points.length; i++) {
      let sumY = 0;
      let count = 0;
      for (let j = -smoothness; j <= smoothness; j++) {
        if (points[i + j]) {
          sumY += points[i + j].y;
          count++;
        }
      }
      let targetY = sumY / count;
      if (filterQ > 1) {
        targetY += (points[i].y - targetY) * qBoost;
      }
      smoothedPoints.push({ ...points[i], y: targetY });
    }
    return smoothedPoints;
  },

  // Временный пропуск для highpass-ноды в визуализаторе, чтобы конвейер не ругался
  filterHigh: (points) => points,

  // 🆕 СТИЛЬНАЯ ВИЗУАЛИЗАЦИЯ КЛАССИЧЕСКОГО ДИЛЕЯ
  delay: (points, settings) => {
    const isActive = settings?.delayActive ?? true;
    const wet = settings?.delayWet ?? 0;
    if (!isActive || wet <= 0) return points;

    const feedback = settings?.delayFeedback ?? 0.4;
    const timeIndex = settings?.delayTime ?? 2; // Берем индекс (0 - длинный, 4 - короткий)

    // Чем меньше индекс (длиннее дилей), тем больше физический сдвиг эха по оси X
    const shiftSamples = Math.max(4, (5 - timeIndex) * 8);

    return points.map((p, i) => {
      // Ищем предыдущую точку в истории буфера на расстоянии shiftSamples
      const pastPoint = points[i - shiftSamples];
      const echoY = pastPoint ? pastPoint.y * feedback : 0;

      // Подмешиваем затухающее эхо к основному сигналу по правилу Wet микса
      return {
        ...p,
        y: p.y * (1 - wet) + (p.y + echoY) * wet,
      };
    });
  },

  // 🆕 СТИЛЬНАЯ ВИЗУАЛИЗАЦИЯ ПИНГ-ПОНГ ДИЛЕЯ
  pingpong: (points, settings) => {
    const isActive = settings?.pingpongActive ?? true;
    const wet = settings?.pingpongWet ?? 0;
    if (!isActive || wet <= 0) return points;

    const feedback = settings?.pingpongFeedback ?? 0.3;
    const timeIndex = settings?.pingpongTime ?? 2;

    // Пинг-понг летает по каналам, сделаем его сдвиг чуть более асимметричным
    const shiftSamples = Math.max(6, (5 - timeIndex) * 11);

    return points.map((p, i) => {
      const pastPoint = points[i - shiftSamples];
      const echoY = pastPoint ? pastPoint.y * feedback : 0;

      return {
        ...p,
        y: p.y * (1 - wet) + (p.y + echoY) * wet,
      };
    });
  },
};

// ============================================================================
// 2. ВСПОМОГАТЕЛЬНЫЙ ГЕНЕРАТОР ЧИСТЫХ ТОЧЕК ОСЦИЛЛЯТОРА
// ============================================================================
const generateBaseOscillatorPoints = (
  oscillatorType,
  filterEnvOctaves,
  pointsCount,
  padding,
  renderWidth,
) => {
  const wavePoints = [];
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
  return wavePoints;
};

// ============================================================================
// 3. REACT КОМПОНЕНТ ВИЗУАЛИЗАТОРА
// ============================================================================
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

    // Сброс и отрисовка темного бэкграунда
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Отрисовка центральной осевой линии
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Чтение базовых параметров осциллятора
    const oscillatorType = instrumentSettings?.oscillatorType || 'square';
    const filterEnvOctaves = instrumentSettings?.filterEnvOctaves ?? 0;

    // Шаг 1: Генерируем чистую исходную волну осциллятора
    let wavePoints = generateBaseOscillatorPoints(
      oscillatorType,
      filterEnvOctaves,
      200, // pointsCount
      padding,
      renderWidth,
    );

    // Шаг 2: ПОЛНОСТЬЮ ДИНАМИЧЕСКИЙ КОНВЕЙЕР ДЕФОРМАЦИИ (Pipeline)
    // Метод .reduce() последовательно прогоняет точки по цепочке DRUM_EFFECTS_CHAIN из глобального паспорта
    wavePoints = DRUM_EFFECTS_CHAIN.reduce((currentPoints, effectKey) => {
      const transformer = EFFECT_TRANSFORMERS[effectKey];
      return transformer
        ? transformer(currentPoints, instrumentSettings)
        : currentPoints;
    }, wavePoints);

    // Шаг 3: ОТРИСОВКА ФИНАЛЬНОЙ СТАБИЛЬНОЙ ЗЕЛЕНОЙ ВОЛНЫ НА ХОЛСТЕ
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

    // Очищаем размытие тени для оптимизации производительности
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
