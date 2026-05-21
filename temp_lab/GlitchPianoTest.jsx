import React, { useEffect, useRef, useState } from 'react';

// 1. Вспомогательная функция сборки шейдеров (вынесена, чтобы не злить линтер)
const compileShaderSource = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const GlitchPianoTest = () => {
  const canvasRef = useRef(null);
  const [activeKeys, setActiveKeys] = useState({});

  // Переключение состояния кнопки (вкл/выкл)
  const toggleKey = (index) => {
    setActiveKeys((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL не поддерживается');
      return;
    }

    const vsSource = `
      attribute vec2 pos;
      void main() {
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_res;
      uniform float u_time;

      void main() {
        float x = gl_FragCoord.x / 5.0;
        float y = gl_FragCoord.y / 5.0;
        float t = u_time * 2.0;

        float wave1 = sin(x / 8.0 + t);
        float cx = x - u_res.x / 10.0;
        float cy = y - u_res.y / 10.0;
        float dist = sqrt(cx * cx + cy * cy);
        float wave2 = sin(dist / 6.0 - t * 1.5);
        float wave3 = sin((x + y) / 12.0 + t);

        float total = (wave1 + wave2 + wave3) / 3.0;
        
        float steps = 8.0;
        float hue = floor((total + 1.0) * 0.5 * steps) / steps;

        vec3 color = vec3(
          sin(hue * 3.0),
          cos(hue * 2.0 + t * 0.5),
          sin(hue * 5.0 - t)
        );

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vs = compileShaderSource(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShaderSource(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    // Игнорируем правила хуков линтера для нативного метода WebGL
    // eslint-disable-next-line react-compiler/react-compiler
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const posLoc = gl.getAttribLocation(program, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'u_res');
    const timeLoc = gl.getUniformLocation(program, 'u_time');

    let animationFrameId;

    const targetFps = 24; // Ваша оптимизация частоты кадров
    const fpsInterval = 1000 / targetFps;
    let then = performance.now();

    const resizeCanvas = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    const render = (now) => {
      animationFrameId = requestAnimationFrame(render);
      const elapsed = now - then;

      if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        resizeCanvas();
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, now * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '150px',
        background: '#000',
        padding: '10px',
        boxSizing: 'border-box',
      }}
    >
      {/* 2. ВСЕ СТИЛИ В ОДНОМ МЕСТЕ (Включая анимацию рамки) */}
      <style>{`
        .keyboardKey {
          display: block;
          margin-top: 50px;
          margin-right: 5px;
          padding: 0;
          width: 50px;
          height: 50px;
          text-transform: uppercase;
          border-radius: 10px;
          box-sizing: border-box;
          background-color: var(--button-color, lightgray);
          box-shadow: 
            0 0 1px 1px var(--black-transparent-20, rgba(0,0,0,0.2)), 
            inset 0px -1px 2px 2px var(--black-transparent-30, rgba(0,0,0,0.3)), 
            inset 0px 1px 2px 1px var(--white, #fff);
          border: 1px solid var(--black, #222);
          font-family: inherit;
          cursor: pointer;
          position: relative;
          transition: background-color 0.1s linear;
        }

        /* Когда кнопка активна — прорубаем окно к общему холсту */
        .keyboardKey.active {
          background-color: transparent;
          box-shadow: 
            inset 0px -1px 2px 2px var(--black-transparent-30, rgba(0,0,0,0.3)), 
            inset 0px 1px 2px 1px rgba(255,255,255,0.1);
        }

        /* Вылетающий резкий глитч-контур */
        .keyboardKey.active::before {
          content: '';
          position: absolute;
          top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: 10px;
          border: 2px solid var(--white, #fff);
          box-shadow: 0 0 8px #ff007f, inset 0 0 4px #00f0ff;
          pointer-events: none;
          animation: borderGlitch 0.4s steps(4) infinite;
        }

        @keyframes borderGlitch {
          0% { top: -1px; left: -1px; right: -1px; bottom: -1px; opacity: 1; }
          25% { top: -4px; left: -2px; right: -4px; bottom: -2px; border-color: #00f0ff; }
          50% { top: -2px; left: -5px; right: -2px; bottom: -5px; border-color: #ff003c; }
          75% { top: -1px; left: -1px; right: -1px; bottom: -1px; opacity: 0; }
          100% { top: -1px; left: -1px; right: -1px; bottom: -1px; opacity: 1; }
        }
      `}</style>

      {/* 3. ОДИН общий Canvas-фон, зажатый внутри контейнера */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          display: 'block',
        }}
      />

      {/* 4. Сетка из 10 кнопок поверх фона */}
      <div
        style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '5px' }}
      >
        {Array.from({ length: 10 }).map((_, index) => {
          const isActive = !!activeKeys[index];
          return (
            <button
              key={index}
              className={`keyboardKey ${isActive ? 'active' : ''}`}
              onClick={() => toggleKey(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GlitchPianoTest;
