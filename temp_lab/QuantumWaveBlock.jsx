import React, { useEffect, useRef } from 'react';

const QuantumWaveBlock = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const requestRef = useRef();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      if (!containerRef.current || !canvasRef.current) return;
      canvas.width = container.clientWidth;
      canvas.height = 400;
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);

    // УВЕЛИЧИЛИ ДО 2500 ЧАСТИЦ
    const totalParticles = 2500;
    const pts = [];

    // Пять сочных неоновых оттенков для вашего синтезатора
    const colors = [
      'rgba(0, 240, 255,', // Голубой
      'rgba(255, 0, 127,', // Розовый
      'rgba(140, 0, 255,', // Фиолетовый
      'rgba(0, 255, 150,', // Изумрудный зелёный
      'rgba(255, 200, 0,', // Кислотно-жёлтый
    ];

    for (let i = 0; i < totalParticles; i++) {
      pts.push({
        index: i,
        z: Math.random() * 900 + 100,
        thickness: Math.random() * 0.45 + 0.15, // Чуть тоньше, чтобы не было каши
        color: colors[Math.floor(Math.random() * colors.length)], // Рандомный выбор из палитры
        timeOffset: Math.random() * 100,
        baseRadius: Math.random() * 270,
      });
    }
    particlesRef.current = pts;

    const renderLoop = () => {
      if (!canvasRef.current) return;

      // Оставили легкий дилей для сохранения сочности спектра
      ctx.fillStyle = 'rgba(1, 1, 3, 0.13)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      timeRef.current += 0.0005;

      mouseRef.current.x +=
        (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y +=
        (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      const cx = canvas.width / 2 + mouseRef.current.x;
      const cy = canvas.height / 2 + mouseRef.current.y;

      const fov = 240;
      const warpSpeed = 0.25; // Медитативная плавная скорость

      particlesRef.current.forEach((p) => {
        // --- МАТЕМАТИКА ФРАКТАЛЬНОГО УЗОРА С ПЛАВНЫМ ЗАКРУЧИВАНИЕМ ПО ОСИ Z ---
        const normIndex = (p.index / totalParticles) * Math.PI * 2;
        const localTime = timeRef.current + p.timeOffset;

        // Вращение нитей вглубь экрана
        const zTwist = p.z * 0.0035;

        const angle =
          normIndex * 5 +
          zTwist +
          Math.sin(normIndex * 2 + localTime * 3) * 1.6;
        const radiusWave =
          Math.sin(normIndex * 3 - localTime * 1.5) *
          Math.cos(normIndex * 1.5 + localTime);

        const currentRadius = p.baseRadius + radiusWave * 45;

        // Координаты старта
        const lastScale = fov / p.z;
        const lastX = cx + Math.cos(angle) * currentRadius * lastScale;
        const lastY = cy + Math.sin(angle) * currentRadius * lastScale;

        // Медленное величественное продвижение вперед
        p.z -= warpSpeed;

        if (p.z <= 0) {
          p.z = Math.random() * 150 + 850;
          p.timeOffset = Math.random() * 100;
          p.baseRadius = Math.random() * 270;
          return;
        }

        // Координаты финиша
        const currentScale = fov / p.z;
        const currentX = cx + Math.cos(angle) * currentRadius * currentScale;
        const currentY = cy + Math.sin(angle) * currentRadius * currentScale;

        // Воздушная перспектива
        const alphaFactor = 1.0 - p.z / 1000;
        const alpha = Math.max(0.02, Math.min(1.0, alphaFactor * 1.4)).toFixed(
          2,
        );

        // ОРИГИНАЛЬНЫЙ РЕНДЕР НИТЕЙ
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);

        ctx.lineWidth = p.thickness * (currentScale * 0.4 + 0.6);
        ctx.strokeStyle = `${p.color}${alpha})`;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    requestRef.current = requestAnimationFrame(renderLoop);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX =
        (e.clientX - rect.left - canvas.width / 2) * 0.25;
      mouseRef.current.targetY = (e.clientY - rect.top - 400 / 2) * 0.25;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        background: '#010102', // Черная бездна
        border: '1px solid #111114',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 6px 30px rgba(0,0,0,1)',
        margin: '15px 0',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default QuantumWaveBlock;
