import React, { useEffect, useRef } from 'react';

const QuantumParticleBg = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({
    x: -1000,
    y: -1000,
    targetX: -1000,
    targetY: -1000,
  });
  const requestRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Функция подгонки холста под полный размер экрана
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ГЕНЕРАЦИЯ ОБЛАКА ЧАСТИЦ (800 штук для плотного космоса)
    const totalParticles = 800;
    const pts = [];

    for (let i = 0; i < totalParticles; i++) {
      pts.push({
        // Случайное распределение в 3D пространстве
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        // Глубина Z от 1 до 200 (задает воздушную перспективу)
        z: Math.random() * 200 + 1,

        // Индивидуальная базовая скорость дрейфа
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.3,

        // Случайный размер
        baseSize: Math.random() * 1.5 + 0.5,

        // Цветовая палитра вашего синта (Розовый -> Голубой)
        color: Math.random() > 0.4 ? 'rgba(0, 240, 255,' : 'rgba(255, 0, 127,',
      });
    }
    particlesRef.current = pts;

    // Цикл симуляции физики и рендеринга
    const renderLoop = () => {
      // Слегка размываем мышь для мягкого интерактивного шлейфа
      mouseRef.current.x +=
        (mouseRef.current.targetX - mouseRef.current.x) * 0.1;
      mouseRef.current.y +=
        (mouseRef.current.targetY - mouseRef.current.y) * 0.1;

      // Очищаем холст
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // 1. Медленный космический дрейф частиц
        p.x += p.speedX;
        p.y += p.speedY;

        // 2. ВОЗДУШНАЯ ПЕРСПЕКТИВА И СВЕТОСИЛА (Расчет глубины)
        // Чем меньше p.z, тем ближе частица к экрану
        const maxDepth = 200;
        const depthFactor = 1.0 - p.z / maxDepth; // 1 (у экрана) -> 0 (в глубокой темноте)

        // Ближние точки крупные и четкие, дальние — микроскопические пиксели
        const currentSize = p.baseSize * (depthFactor * 1.8 + 0.4);

        // Контраст: ближние горят ярко, дальние теряют контраст и затухают
        const alpha = (depthFactor * 0.85 + 0.15).toFixed(2);

        // 3. ИНТЕРАКТИВНЫЙ ОТКЛИК НА МЫШКУ
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120; // Радиус отталкивания мыши

        if (dist < maxDist) {
          // Сила отталкивания зависит от близости к мыши и глубины (ближние сильнее реагируют)
          const force = (maxDist - dist) / maxDist;
          const pushX = (dx / dist) * force * 4 * (depthFactor + 0.2);
          const pushY = (dy / dist) * force * 4 * (depthFactor + 0.2);
          p.x += pushX;
          p.y += pushY;
        }

        // 4. ТОР СЦЕНЫ (Если точка уплыла за экран — возвращаем с противоположной стороны)
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // 5. РЕНДЕР КРИСТАЛЬНО ЧЕТКОЙ ТОЧКИ (Без размытия)
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha})`;
        ctx.fill();
      });

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    requestRef.current = requestAnimationFrame(renderLoop);

    // Слушатель движения мыши
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Очистка при размонтировании
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1, // Сидит под всеми кнопками и панелями вашего синта
        background: '#040406', // Глубокий, почти черный космический фон
        display: 'block',
      }}
    />
  );
};

export default QuantumParticleBg;
