import React, { useState, useEffect, useRef } from 'react';

const DisplacementLab = () => {
  const [isActive, setIsActive] = useState(false);
  const [baseFrequency, setBaseFrequency] = useState(0.01);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // 24 FPS таймер для движения шума
  useEffect(() => {
    const fpsInterval = 1000 / 24;
    let time = 0;

    const animate = (timestamp) => {
      if (previousTimeRef.current === undefined)
        previousTimeRef.current = timestamp;
      const elapsed = timestamp - previousTimeRef.current;

      if (elapsed > fpsInterval) {
        time += 0.05;
        // Двигаем частоту шума по синусоиде, чтобы он хаотично бурлил
        setBaseFrequency(0.02 + Math.sin(time) * 0.01);
        previousTimeRef.current = timestamp - (elapsed % fpsInterval);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      setBaseFrequency(0.01); // Сброс в покой
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive]);

  return (
    <div
      style={{
        padding: '40px',
        background: '#111',
        minHeight: '40vh',
        fontFamily: 'monospace',
      }}
    >
      {/* 1. ОПРЕДЕЛЯЕМ SVG ФИЛЬТР СМЕЩЕНИЯ */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="liquid-glitch-filter">
            {/* Генерируем фрактальный шум Перлина */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${baseFrequency} 0.05`}
              numOctaves="2"
              result="noise"
            />
            {/* Карта смещения: берет шум и сдвигает пиксели кнопки по оси X и Y */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={
                isActive ? '20' : '0'
              } /* Сила искажения (0 в покое, 20 при старте) */
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <style>{`
        .pianoKey-displacement {
          display: block; width: 70px; height: 70px; text-transform: uppercase; border-radius: 10px; box-sizing: border-box;
          background-color: var(--button-color, lightgray);
          box-shadow: 0 0 1px 1px rgba(0,0,0,0.2), inset 0px -1px 2px 2px rgba(0,0,0,0.3), inset 0px 1px 2px 1px #fff;
          border: 1px solid #222; cursor: pointer; position: relative; outline: none; font-weight: bold;
          transition: transform 0.1s ease;
        }
        /* Применяем фильтр смещения к кнопке при активации */
        .pianoKey-displacement.active-state {
          filter: url(#liquid-glitch-filter);
          background-color: #ff007f !important; /* Меняем цвет на неоновый в угаре */
          color: #fff;
          box-shadow: 0 0 15px #ff007f;
        }
        .label { color: #888; font-size: 11px; margin-bottom: 10px; }
      `}</style>

      <div className="label">
        LAB 1: DISPLACEMENT MAP (BUTTON MELTING EFFECT)
      </div>

      <button
        className={`pianoKey-displacement ${isActive ? 'active-state' : ''}`}
        onClick={() => setIsActive(!isActive)}
      >
        {isActive ? 'MELT' : 'STIFF'}
      </button>
    </div>
  );
};

export default DisplacementLab;
