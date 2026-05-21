import React, { useState, useEffect, useRef } from 'react';

const compileShaderSource = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const GlitchLab = () => {
  const [active1, setActive1] = useState(false);
  const [active2, setActive2] = useState(false);
  const [active3, setActive3] = useState(false);
  const [active4, setActive4] = useState(false);
  const [isAnimating4, setIsAnimating4] = useState(false);
  const [active5, setActive5] = useState(false);
  const [isAnimating5, setIsAnimating5] = useState(false);

  const [time, setTime] = useState(0);
  const [progress4, setProgress4] = useState(0);
  const [waveTime4, setWaveTime4] = useState(0);
  const [progress5, setProgress5] = useState(0);
  const [waveTime5, setWaveTime5] = useState(0);

  const canvasRef1 = useRef(null);
  const canvasRef2 = useRef(null);
  const canvasRef3 = useRef(null);
  const canvasRef4 = useRef(null);
  const canvasRef5 = useRef(null);

  const requestRef = useRef();
  const previousTimeRef = useRef();

  // 1. Единый таймер для кнопок 1, 2, 3 (24 FPS)
  useEffect(() => {
    const fpsInterval = 1000 / 24;
    const anyActive = active1 || active2 || active3;
    const animate = (timestamp) => {
      if (previousTimeRef.current === undefined)
        previousTimeRef.current = timestamp;
      const elapsed = timestamp - previousTimeRef.current;
      if (elapsed > fpsInterval) {
        setTime((prev) => prev + 0.15);
        previousTimeRef.current = timestamp - (elapsed % fpsInterval);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    if (anyActive) requestRef.current = requestAnimationFrame(animate);
    else {
      cancelAnimationFrame(requestRef.current);
      setTime(0);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [active1, active2, active3]);

  // 2. Таймер для Варианта 4
  useEffect(() => {
    let animId;
    const fpsInterval = 1000 / 24;
    let lastTime = performance.now();
    const loop = (timestamp) => {
      const elapsed = timestamp - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);
        if (active4) {
          setProgress4((p) => Math.min(1.0, p + 0.12));
          setWaveTime4((t) => t + 0.2);
        } else {
          setProgress4((p) => {
            const next = p - 0.15;
            if (next <= 0) {
              setIsAnimating4(false);
              return 0;
            }
            return next;
          });
          setWaveTime4((t) => t + 0.2);
        }
      }
      animId = requestAnimationFrame(loop);
    };
    if (active4 || isAnimating4) animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active4, isAnimating4]);

  // 3. Исправленный таймер для Варианта 5 (Плавный еле видимый транзит)
  useEffect(() => {
    let animId;
    const fpsInterval = 1000 / 24;
    let lastTime = performance.now();
    const loop = (timestamp) => {
      const elapsed = timestamp - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);
        if (active5) {
          setProgress5((p) => Math.min(1.0, p + 0.05));
          setWaveTime5((t) => t + 0.16);
        } else {
          setProgress5((p) => {
            const next = p - 0.08;
            if (next <= 0) {
              setIsAnimating5(false);
              return 0;
            }
            return next;
          });
          setWaveTime5((t) => t + 0.16);
        }
      }
      animId = requestAnimationFrame(loop);
    };
    if (active5 || isAnimating5) animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active5, isAnimating5]);

  const handleToggle4 = () => {
    if (!active4) {
      setIsAnimating4(true);
      setActive4(true);
    } else {
      setActive4(false);
    }
  };
  const handleToggle5 = () => {
    if (!active5) {
      setIsAnimating5(true);
      setActive5(true);
    } else {
      setActive5(false);
    }
  };

  // WebGL инициализатор
  const initWebGLPlasma = (canvas, renderCondition) => {
    if (!canvas || !renderCondition) return;
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
        float x = gl_FragCoord.x / 4.0; float y = gl_FragCoord.y / 4.0; float t = u_time * 2.5;
        float total = (sin(x / 5.0 + t) + cos(y / 5.0 - t)) / 2.0; float steps = 6.0; float hue = floor((total + 1.0) * 0.5 * steps) / steps;
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
      if (!canvas) return;
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
    };
  };

  useEffect(() => {
    return initWebGLPlasma(canvasRef1.current, active1);
  }, [active1]);
  useEffect(() => {
    return initWebGLPlasma(canvasRef2.current, active2);
  }, [active2]);
  useEffect(() => {
    return initWebGLPlasma(canvasRef3.current, active3);
  }, [active3]);
  useEffect(() => {
    return initWebGLPlasma(canvasRef4.current, isAnimating4);
  }, [isAnimating4]);
  useEffect(() => {
    return initWebGLPlasma(canvasRef5.current, isAnimating5);
  }, [isAnimating5]);

  // Идеальный шаблон скругленного прямоугольника 50х50 (с border-radius 10px в сетке SVG 0-100)
  const perfectRectPath =
    'M 12,2 L 88,2 Q 98,2 98,12 L 98,88 Q 98,98 88,98 L 12,98 Q 2,98 2,88 L 2,12 Q 2,2 12,2 Z';

  const getOldBlobPath = (t) => {
    if (t === 0) return perfectRectPath;
    const center = 50;
    const points = [];
    const numPoints = 12;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius =
        45 + (Math.sin(angle * 3 + t) * 6 + Math.cos(angle * 2 - t) * 3);
      points.push(
        `${Math.max(2, Math.min(98, center + Math.cos(angle) * radius)).toFixed(1)},${Math.max(2, Math.min(98, center + Math.sin(angle) * radius)).toFixed(1)}`,
      );
    }
    return (
      `M ${points} ` +
      points
        .slice(1)
        .map((p) => `L ${p}`)
        .join(' ') +
      ' Z'
    );
  };

  const getSmoothRectBlobPath = (progress, waveTime) => {
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
    if (progress === 0) return perfectRectPath;
    const center = 50;
    const distorted = basePoints.map((pt) => {
      const angle = Math.atan2(pt.y - center, pt.x - center);
      const wave =
        (Math.sin(angle * 4 + waveTime) * 7 +
          Math.cos(angle * 3 - waveTime) * 4) *
        progress;
      return `${Math.max(2, Math.min(98, pt.x + Math.cos(angle) * wave)).toFixed(1)},${Math.max(2, Math.min(98, pt.y + Math.sin(angle) * wave)).toFixed(1)}`;
    });
    return (
      `M ${distorted} ` +
      distorted
        .slice(1)
        .map((p) => `L ${p}`)
        .join(' ') +
      ' Z'
    );
  };

  // ИСПРАВЛЕННЫЙ ВАРИАНТ 5: Полное 12-точечное Безье-сглаживание с идеальным совпадением геометрии
  const getLiquidRectBlobPath = (progress, waveTime) => {
    // Используем ТУ ЖЕ САМУЮ 12-точечную структуру, что и в Варианте 4, чтобы размеры на старте совпали до микрона
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

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: при прогрессе 0 отдаем чистую нативную строку прямоугольника,
    // это гарантирует 100% визуальное совпадение с серой кнопкой без микро-сжатий.
    if (progress === 0) {
      return perfectRectPath;
    }

    const center = 50;
    const pts = basePoints.map((pt) => {
      const angle = Math.atan2(pt.y - center, pt.x - center);
      // Плавное нарастание амплитуды
      const wave =
        (Math.sin(angle * 4 + waveTime) * 6 +
          Math.cos(angle * 3 - waveTime) * 3) *
        progress;
      return {
        x: Math.max(2, Math.min(98, pt.x + Math.cos(angle) * wave)),
        y: Math.max(2, Math.min(98, pt.y + Math.sin(angle) * wave)),
      };
    });

    // Собираем кривую через интерполяцию средних точек (Алгоритм сглаживания Безье)
    let path = `M ${((pts[0].x + pts[pts.length - 1].x) / 2).toFixed(1)},${((pts[0].y + pts[pts.length - 1].y) / 2).toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const xc = ((pts[i].x + next.x) / 2).toFixed(1);
      const yc = ((pts[i].y + next.y) / 2).toFixed(1);
      path += ` Q ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${xc},${yc}`;
    }
    return path + ' Z';
  };

  const pathForBtn1 = getOldBlobPath(time);
  const pathForBtn3 = getOldBlobPath(time);
  const pathForBtn4 = getSmoothRectBlobPath(progress4, waveTime4);
  const pathForBtn5 = getLiquidRectBlobPath(progress5, waveTime5); // Наша обновленная бесшовная геометрия

  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '25px',
        background: '#111',
        minHeight: '100vh',
      }}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="v1-blob-mask" clipPathUnits="objectBoundingBox">
            <path d={pathForBtn1} transform="scale(0.01)" />
          </clipPath>
          <clipPath id="unified-blob-mask" clipPathUnits="objectBoundingBox">
            <path d={pathForBtn3} transform="scale(0.01)" />
          </clipPath>
          <clipPath id="smooth-rect-mask" clipPathUnits="objectBoundingBox">
            <path d={pathForBtn4} transform="scale(0.01)" />
          </clipPath>
          <clipPath id="liquid-rect-mask" clipPathUnits="objectBoundingBox">
            <path d={pathForBtn5} transform="scale(0.01)" />
          </clipPath>
        </defs>
      </svg>

      <style>{`
        .pianoKey {
          display: block; width: 50px; height: 50px; text-transform: uppercase; border-radius: 10px; box-sizing: border-box;
          background-color: var(--button-color, lightgray);
          box-shadow: 0 0 1px 1px var(--black-transparent-20, rgba(0,0,0,0.2)), inset 0px -1px 2px 2px var(--black-transparent-30, rgba(0,0,0,0.3)), inset 0px 1px 2px 1px var(--white, #fff);
          border: 1px solid var(--black, #222); font-family: inherit; cursor: pointer; position: relative; outline: none;
        }
        .pianoKey.active-state { background-color: transparent !important; border-color: transparent !important; box-shadow: none !important; }
        .live-wrapper { position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; pointer-events: none; }
        .v1-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; clip-path: url(#v1-blob-mask); z-index: 1; }
        .v1-contour { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; }
        .v2-canvas { position: absolute; top: 1px; left: 1px; width: calc(100% - 2px); height: calc(100% - 2px); border-radius: 9px; z-index: 1; }
        .v3-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; clip-path: url(#unified-blob-mask); z-index: 1; }
        .v4-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; clip-path: url(#smooth-rect-mask); z-index: 1; }
        .v5-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; clip-path: url(#liquid-rect-mask); z-index: 1; }
        .label { color: #888; font-size: 11px; margin-bottom: 5px; font-family: monospace; }
        .row { display: flex; align-items: center; gap: 20px; }
      `}</style>

      <div className="row">
        <div>
          <div className="label">ORIGINAL STATIC</div>
          <button className="pianoKey">
            <span>OFF</span>
          </button>
        </div>
      </div>

      {/* ВАРИАНТ 1 */}
      <div className="row">
        <div>
          <div className="label">
            1. OVERLAY (COLOR PLASMA SHAPE + PINK CONTOUR)
          </div>
          <button
            className={`pianoKey ${active1 ? 'active-state' : ''}`}
            onClick={() => setActive1(!active1)}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                color: active1 ? '#fff' : 'inherit',
              }}
            >
              {active1 ? 'ON' : '1'}
            </span>
            {active1 && (
              <div className="live-wrapper">
                <canvas ref={canvasRef1} className="v1-canvas" />
                <svg viewBox="0 0 100 100" className="v1-contour">
                  <path
                    d={pathForBtn1}
                    fill="transparent"
                    stroke="#ff007f"
                    strokeWidth="3"
                    style={{ transition: 'd 0.05s linear' }}
                  />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ВАРИАНТ 2 */}
      <div className="row">
        <div>
          <div className="label">2. SPLIT (ONLY SQUARE PLASMA, NO CONTOUR)</div>
          <button
            className={`pianoKey ${active2 ? 'active-state' : ''}`}
            onClick={() => setActive2(!active2)}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                color: active2 ? '#fff' : 'inherit',
              }}
            >
              {active2 ? 'ON' : '2'}
            </span>
            {active2 && (
              <div className="live-wrapper">
                <canvas ref={canvasRef2} className="v2-canvas" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ВАРИАНТ 3 */}
      <div className="row">
        <div>
          <div className="label">3. UNIFIED (LIQUID MASK, INSTANT TOGGLE)</div>
          <button
            className={`pianoKey ${active3 ? 'active-state' : ''}`}
            onClick={() => setActive3(!active3)}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                color: active3 ? '#fff' : 'inherit',
              }}
            >
              {active3 ? 'ON' : '3'}
            </span>
            {active3 && (
              <div className="live-wrapper">
                <canvas ref={canvasRef3} className="v3-canvas" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ВАРИАНТ 4 */}
      <div className="row">
        <div>
          <div className="label">
            4. UNIFIED SMOOTH (LINEAR MORPH FROM/TO RECTANGLE)
          </div>
          <button
            className={`pianoKey ${isAnimating4 ? 'active-state' : ''}`}
            onClick={handleToggle4}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                color: active4 ? '#fff' : 'inherit',
              }}
            >
              {active4 ? 'ON' : '4'}
            </span>
            {isAnimating4 && (
              <div className="live-wrapper">
                <canvas ref={canvasRef4} className="v4-canvas" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ВАРИАНТ 5: ТЕПЕРЬ С ИДЕАЛЬНЫМ ПОДГОНОМ СТАРТОВОГО ПРЯМОУГОЛЬНИКА */}
      <div className="row">
        <div>
          <div className="label">
            5. FIXED SMOOTH LIQUID (PERFECT TRANSITION FROM/TO EXTRACT
            RECTANGLE)
          </div>
          <button
            className={`pianoKey ${isAnimating5 ? 'active-state' : ''}`}
            onClick={handleToggle5}
          >
            <span
              style={{
                position: 'relative',
                zIndex: 3,
                color: active5 ? '#fff' : 'inherit',
              }}
            >
              {active5 ? 'ON' : '5'}
            </span>
            {isAnimating5 && (
              <div className="live-wrapper">
                <canvas ref={canvasRef5} className="v5-canvas" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlitchLab;
