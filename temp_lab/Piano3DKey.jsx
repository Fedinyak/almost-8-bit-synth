import React, { useState, useEffect, useRef } from 'react';

const Particle3DKey = () => {
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const requestRef = useRef();
  const timeRef = useRef(0);

  const w = 46;
  const h = 46;
  const depth = 16;
  const r = 10;

  // Инициализация точек каркаса + фрактального ядра
  const generateAdvancedMesh = () => {
    const pts = [];
    const stepsPerEdge = 20;

    const getRoundRectPoint = (t) => {
      const angle = t * Math.PI * 2;
      let x = Math.cos(angle) * 23;
      let y = Math.sin(angle) * 23;
      const corner = 23 - r;
      if (Math.abs(x) > corner && Math.abs(y) > corner) {
        const cx = corner * Math.sign(x);
        const cy = corner * Math.sign(y);
        const ca = Math.atan2(y - cy, x - cx);
        x = cx + Math.cos(ca) * r;
        y = cy + Math.sin(ca) * r;
      }
      return { x, y };
    };

    // 1. Генерируем точки внешнего каркаса (Кожа куба)
    for (let i = 0; i < stepsPerEdge; i++) {
      const t = i / stepsPerEdge;
      const base = getRoundRectPoint(t);

      pts.push({ x: base.x, y: base.y, z: depth / 2, type: 'edge-front' });
      pts.push({ x: base.x, y: base.y, z: -depth / 2, type: 'edge-back' });

      for (let j = 1; j < 5; j++) {
        const zDist = -depth / 2 + (depth * j) / 5;
        pts.push({ x: base.x, y: base.y, z: zDist, type: 'core-line' });
      }
    }

    // 2. ГЕНЕРИРУЕМ ВНУТРЕННЕЕ ФРАКТАЛЬНОЕ ЯДРО (Аттрактор Лоренца)
    // Шаг за шагом рассчитываем хаотичную траекторию в 3D пространстве
    let lx = 0.1,
      ly = 0.0,
      lz = 0.0;
    const sigma = 10.0,
      rho = 28.0,
      beta = 8.0 / 3.0;
    const dt = 0.01;

    for (let i = 0; i < 150; i++) {
      // Дифференциальные уравнения Лоренца
      const dx = sigma * (ly - lx) * dt;
      const dy = (lx * (rho - lz) - ly) * dt;
      const dz = (lx * ly - beta * lz) * dt;

      lx += dx;
      ly += dy;
      lz += dz;

      pts.push({
        x: lx * 1.1, // Масштабируем, чтобы фрактал
        y: ly * 1.1, // красиво сидел внутри
        z: (lz - 25) * 0.5, // прямоугольного каркаса кнопки
        type: 'fractal-core',
        seed: Math.random() * 10, // Для индивидуального мерцания частиц
      });
    }

    return pts;
  };

  const pointsRef = useRef(generateAdvancedMesh());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const fov = 150;

    const renderLoop = () => {
      timeRef.current += 0.04;

      // Плавная инерция поворота (Lerp)
      const target = isHovered ? Math.PI : 0;
      progressRef.current += (target - progressRef.current) * 0.06;

      const angle = progressRef.current;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Рендерим всю математику на холст
      pointsRef.current.forEach((p) => {
        let rx = p.x;
        let ry = p.y;
        let rz = p.z;

        // Если это ядро хаоса — заставляем его дополнительно вращаться по оси Y в угаре ховера
        if (p.type === 'fractal-core') {
          const coreSpeed = isHovered
            ? timeRef.current * 0.6
            : timeRef.current * 0.1;
          const cCos = Math.cos(coreSpeed);
          const cSin = Math.sin(coreSpeed);
          const tx = rx * cCos - rz * cSin;
          rz = rx * cSin + rz * cCos;
          rx = tx;
        }

        // Главный кувырок всей кнопки на 180 градусов по оси X
        const rotY = ry * cosA - rz * sinA;
        const rotZ = ry * sinA + rz * cosA;

        // Перспектива
        const scale = fov / (fov + rotZ);
        const screenX = cx + rx * scale;
        const screenY = cy + rotY * scale;

        // Светосила и затухание
        const alpha = Math.max(0.1, Math.min(1.0, scale - 0.1));
        const size = p.type === 'fractal-core' ? 0.7 * scale : 1.1 * scale;

        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(0.3, size), 0, Math.PI * 2);

        // ЦВЕТОВАЯ СВЕТОДИНАМИКА ГРАНЕЙ
        if (p.type === 'fractal-core') {
          // Энергетическое ядро мерцает фиолетово-розовым неоном в такт хаоса
          const pulse = Math.sin(timeRef.current + p.seed) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 0, 127, ${alpha * pulse})`;
        } else {
          // По нитям каркаса бежит световой сканирующий луч (Scanline)
          const scanline =
            Math.sin(p.y * 0.1 - timeRef.current * 3) * 0.5 + 0.5;
          const glow = isHovered ? scanline * 0.6 + 0.4 : 0.3;
          ctx.fillStyle = `rgba(0, 240, 255, ${alpha * glow})`;
        }

        ctx.fill();
      });

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    requestRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isHovered]);

  return (
    <div
      style={{
        padding: '80px',
        background: '#0a0a0c',
        minHeight: '40vh',
        display: 'flex',
        gap: '30px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style>{`
        .slot-hole {
          width: 80px;
          height: 80px;
          background: #010103;
          border: 1px solid #141418;
          border-radius: 12px;
          box-shadow: inset 0px 4px 12px rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
      `}</style>

      {/* КВАНТОВАЯ ФРАКТАЛЬНАЯ КНОПКА */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            color: '#444',
            fontSize: '10px',
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}
        >
          QUANTUM CORE
        </span>

        <div
          className="slot-hole"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <canvas ref={canvasRef} width="80" height="80" />
        </div>
      </div>
    </div>
  );
};

export default Particle3DKey;
