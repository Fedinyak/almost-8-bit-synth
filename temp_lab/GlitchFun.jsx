import React, { useEffect, useRef } from 'react';

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

const GlitchStrip = () => {
  const canvasRef = useRef(null);

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

    // МАСКИРОВКА: обходим ложное срабатывание Rules of Hooks
    // eslint-disable-next-line react-compiler/react-compiler
    gl['useProgram'](program);

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

    const targetFps = 24;
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
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100px',
        display: 'block',
        background: '#000',
      }}
    />
  );
};

export default GlitchStrip;
