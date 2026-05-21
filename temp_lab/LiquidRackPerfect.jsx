import React, { useState, useEffect, useRef } from 'react';

// Чистый сборщик шейдеров
const compileShaderSource = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

// --- КОМПОНЕНТ ОДНОЙ ЖИВОЙ КЛАВИШИ ---
const LiquidKey = ({ index, isActive }) => {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [waveTime, setWaveTime] = useState(0);
  const [isWebGLAlive, setIsWebGLAlive] = useState(false);

  // Физика разгона и затухания формы (24 FPS)
  useEffect(() => {
    let animId;
    const fpsInterval = 1000 / 24;
    let lastTime = performance.now();

    const loop = (timestamp) => {
      const elapsed = timestamp - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);

        if (isActive) {
          setProgress((p) => Math.min(1.0, p + 0.05)); // Мягкий транзит на старте
          setWaveTime((t) => t + 0.16);
        } else {
          setProgress((p) => {
            const next = p - 0.08; // Мягкий возврат в идеальный прямоугольник
            if (next <= 0) {
              setIsWebGLAlive(false); // Полностью тушим WebGL, когда кнопка застыла
              return 0;
            }
            return next;
          });
          setWaveTime((t) => t + 0.16);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    if (isActive || isWebGLAlive) {
      if (isActive && !isWebGLAlive) setIsWebGLAlive(true);
      animId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animId);
  }, [isActive, isWebGLAlive]);

  // WebGL Жидкая Плазма
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isWebGLAlive) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vs = compileShaderSource(
      gl,
      gl.VERTEX_SHADER,
      `attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }`,
    );
    const fs = compileShaderSource(
      gl,
      gl.FRAGMENT_SHADER,
      `
      precision highp float; uniform vec2 u_res; uniform float u_time;
      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        float t = u_time * 2.5;
        float total = (sin(uv.x * 5.0 + t) + cos(uv.y * 5.0 - t)) / 2.0;
        float steps = 6.0; float hue = floor((total + 1.0) * 0.5 * steps) / steps;
        gl_FragColor = vec4(sin(hue * 4.0), cos(hue * 2.0 + t), sin(hue * 1.0 - t), 1.0);
      }
    `,
    );
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    gl.useProgram(prog);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(prog, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(prog, 'u_res');
    const timeLoc = gl.getUniformLocation(prog, 'u_time');
    let frameId;
    const render = () => {
      if (!canvasRef.current) return;
      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, performance.now() * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(prog);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext(); // Защита от Too many WebGL contexts
    };
  }, [isWebGLAlive]);

  // Генератор 12-точечного Безье-сплайна (Мягкие жидкие грани)
  const getLiquidRectBlobPath = () => {
    const basePoints = [
      { x: 12, y: 2 },
      { x: 50, y: 2 },
      { x: 88, y: 2 },
      { x: 98, y: 12 },
      { x: 98, y: 50 },
      { x: 98, y: 88 },
      { x: 88, y: 98 },
      { x: 50, y: 98 },
      { x: 12, y: 98 },
      { x: 2, y: 88 },
      { x: 2, y: 50 },
      { x: 2, y: 12 },
    ];

    // Идеальный стартовый прямоугольник со скруглением 10px под вашу кнопку
    if (progress === 0) {
      return 'M 12,2 L 88,2 Q 98,2 98,12 L 98,88 Q 98,98 88,98 L 12,98 Q 2,98 2,88 L 2,12 Q 2,2 12,2 Z';
    }

    const center = 50;
    const pts = basePoints.map((pt) => {
      const angle = Math.atan2(pt.y - center, pt.x - center);
      const wave =
        (Math.sin(angle * 4 + waveTime) * 6 +
          Math.cos(angle * 3 - waveTime) * 3) *
        progress;
      return {
        x: Math.max(2, Math.min(98, pt.x + Math.cos(angle) * wave)),
        y: Math.max(2, Math.min(98, pt.y + Math.sin(angle) * wave)),
      };
    });

    // ЖЕЛЕЗОБЕТОННАЯ СБОРКА СТРОКИ: Берём среднюю точку между первой и последней для старта
    const startX = ((pts[0].x + pts[pts.length - 1].x) / 2).toFixed(1);
    const startY = ((pts[0].y + pts[pts.length - 1].y) / 2).toFixed(1);

    let path = `M ${startX},${startY}`;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const xc = ((pts[i].x + next.x) / 2).toFixed(1);
      const yc = ((pts[i].y + next.y) / 2).toFixed(1);
      path += ` Q ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${xc},${yc}`;
    }
    return path + ' Z';
  };

  const maskId = `liquid-mask-${index}`;

  return (
    <div style={{ position: 'relative' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={maskId} clipPathUnits="objectBoundingBox">
            <path d={getLiquidRectBlobPath()} transform="scale(0.01)" />
          </clipPath>
        </defs>
      </svg>

      <button className={`pianoKey ${isWebGLAlive ? 'active-state' : ''}`}>
        <span>{index + 1}</span>
        {isWebGLAlive && (
          <div className="live-wrapper">
            <canvas
              ref={canvasRef}
              style={{ clipPath: `url(#${maskId})` }}
              className="live-canvas"
            />
          </div>
        )}
      </button>
    </div>
  );
};

// --- ОСНОВНОЙ РЭК СЕКВЕНСОРА ---
const LiquidRackPerfect = () => {
  const [steps, setSteps] = useState({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
  });

  return (
    <div
      style={{
        padding: '40px',
        background: '#111',
        minHeight: '40vh',
        fontFamily: 'monospace',
        color: '#fff',
      }}
    >
      <div style={{ color: '#888', fontSize: '11px', margin: '0 0 20px 0' }}>
        PRODUCTION READY: LIQUID UNIFIED SMOOTH (BUGFIX EDITION)
      </div>

      <style>{`
        .sequencer-rack {
          display: flex; background: #161616; padding: 25px; border-radius: 16px; border: 1px solid #222; width: fit-content; gap: 10px;
        }

        .pianoKey {
          display: block; width: 55px; height: 55px; text-transform: uppercase; border-radius: 10px; box-sizing: border-box;
          background-color: var(--button-color, lightgray);
          box-shadow: 0 0 1px 1px var(--black-transparent-20, rgba(0,0,0,0.2)), inset 0px -1px 2px 2px var(--black-transparent-30, rgba(0,0,0,0.3)), inset 0px 1px 2px 1px var(--white, #fff);
          border: 1px solid var(--black, #222); cursor: pointer; outline: none; font-weight: bold; color: #333; position: relative;
        }

        .pianoKey.active-state {
          background-color: transparent !important; box-shadow: none !important; border-color: transparent !important;
          color: #fff !important; text-shadow: 0 0 6px #fff; font-size: 15px;
        }

        .live-wrapper { position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; pointer-events: none; }
        .live-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }
        .pianoKey span { position: relative; z-index: 5; }
      `}</style>

      <div className="sequencer-rack">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            onClick={() => setSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))}
          >
            <LiquidKey index={idx} isActive={steps[idx]} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiquidRackPerfect;
