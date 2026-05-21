import React, { useState, useEffect, useRef } from 'react';

const PerfectFiltersLab = () => {
  // Состояния для Лаборатории 1 (Displacement)
  const [activeDisp, setActiveDisp] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [animatingDisp, setAnimatingDisp] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  // Прогресс анимации для каждой из 4 кнопок (от 0 до 1)
  const [progress, setProgress] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [waveTime, setWaveTime] = useState(0);

  // Состояния для Лаборатории 2 (Metaballs)
  const [activeMeta, setActiveMeta] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [metaTime, setMetaTime] = useState(0);

  const requestRef = useRef();
  const previousTimeRef = useRef();

  // ЕДИНЫЙ ТАЙМЕР АНИМАЦИИ (Оптимизация 24 FPS)
  useEffect(() => {
    const fpsInterval = 1000 / 24;

    const animate = (timestamp) => {
      if (previousTimeRef.current === undefined)
        previousTimeRef.current = timestamp;
      const elapsed = timestamp - previousTimeRef.current;

      if (elapsed > fpsInterval) {
        // Двигаем внутреннее время волн
        setWaveTime((t) => t + 0.2);
        setMetaTime((t) => t + 0.1);

        // Управляем плавным разгоном и затуханием (Scale) для каждой кнопки Displacement
        setProgress((prev) => {
          const next = { ...prev };
          let updated = false;

          for (let id = 1; id <= 4; id++) {
            if (activeDisp[id]) {
              if (next[id] < 1) {
                next[id] = Math.min(1.0, next[id] + 0.1); // Плавный разгон за 10 кадров
                updated = true;
              }
            } else {
              if (next[id] > 0) {
                next[id] = Math.max(0.0, next[id] - 0.15); // Плавное затухание
                updated = true;
                if (next[id] === 0) {
                  setAnimatingDisp((prevAnim) => ({
                    ...prevAnim,
                    [id]: false,
                  }));
                }
              }
            }
          }
          return updated ? next : prev;
        });

        previousTimeRef.current = timestamp - (elapsed % fpsInterval);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [activeDisp]);

  const toggleDisp = (id) => {
    if (!activeDisp[id]) {
      setAnimatingDisp((prev) => ({ ...prev, [id]: true }));
      setActiveDisp((prev) => ({ ...prev, [id]: true }));
    } else {
      setActiveDisp((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleMeta = (id) => {
    setActiveMeta((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // МАТЕМАТИКА: вычисляем частоту шума индивидуально для каждой кнопки
  // Если progress = 0, частота по осям X и Y становится статичной, что убирает деформацию
  const getFilterParams = (id, maxScale) => {
    const p = progress[id];
    const scale = (p * maxScale).toFixed(1);
    // Меняем частоту шума в зависимости от времени, но гасим её в 0 при выключении
    const freqX =
      p > 0 ? (0.02 + Math.sin(waveTime + id) * 0.005).toFixed(4) : '0.0000';
    const freqY =
      p > 0
        ? (0.04 + Math.cos(waveTime * 0.8 + id) * 0.01).toFixed(4)
        : '0.0000';

    return { scale, freq: `${freqX} ${freqY}` };
  };

  const p1 = getFilterParams(1, 12); // Мягкий угар
  const p2 = getFilterParams(2, 25); // Средний
  const p3 = getFilterParams(3, 45); // Сильный
  const p4 = getFilterParams(4, 80); // Тотальный распад

  // Вычисляем легкое смещение кнопок в Метаболлах, чтобы они терлись боками и сливались
  const getMetaOffset = (id) => {
    if (!activeMeta[id]) return '0px';
    return `${Math.sin(metaTime + id) * 4}px`;
  };

  return (
    <div
      style={{
        padding: '40px',
        background: '#111',
        minHeight: '100vh',
        fontFamily: 'monospace',
        color: '#fff',
      }}
    >
      {/* ======================================================= */}
      {/* СТЕНД SVG ДИНАМИЧЕСКИХ ФИЛЬТРОВ                         */}
      {/* ======================================================= */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          {/* Фильтры для кнопок Лаборатории 1 (Индивидуальные частоты и масштабы) */}
          <filter id="disp-filter-1">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={p1.freq}
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={p1.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="disp-filter-2">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={p2.freq}
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={p2.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="disp-filter-3">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={p3.freq}
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={p3.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="disp-filter-4">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={p4.freq}
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={p4.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Исправленный фильтр метаболлов с усиленным сжатием альфа-канала */}
          <filter id="metaballs-goo-perfect">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="12"
              result="blur"
            />
            {/* Коэффициент 22 и смещение -9 делают слияние невероятно плотным и четким */}
            <feColorMatrix
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <style>{`
        /* Наш базовый прямоугольник с вашими тенями */
        .pianoKey-base {
          display: block; width: 65px; height: 65px; text-transform: uppercase; border-radius: 10px; box-sizing: border-box;
          background-color: var(--button-color, lightgray);
          box-shadow: 0 0 1px 1px rgba(0,0,0,0.2), inset 0px -1px 2px 2px rgba(0,0,0,0.3), inset 0px 1px 2px 1px #fff;
          border: 1px solid #222; cursor: pointer; position: relative; outline: none; font-weight: bold;
          transition: transform 0.1s ease;
        }

        /* Динамическое переключение фильтров (включается только при наличии прогресса) */
        .disp-1 { filter: url(#disp-filter-1); }
        .disp-2 { filter: url(#disp-filter-2); }
        .disp-3 { filter: url(#disp-filter-3); }
        .disp-4 { filter: url(#disp-filter-4); }

        /* Красочные неоновые состояния */
        .active-disp-1 { background-color: #00ff66 !important; box-shadow: 0 0 15px #00ff66; color: #000; }
        .active-disp-2 { background-color: #00f0ff !important; box-shadow: 0 0 20px #00f0ff; color: #000; }
        .active-disp-3 { background-color: #ff007f !important; box-shadow: 0 0 25px #ff007f; color: #fff; }
        .active-disp-4 { background-color: #ffcc00 !important; box-shadow: 0 0 40px #ffcc00; color: #000; }

        /* ЗОНА МЕТАБОЛЛОВ */
        .metaball-zone {
          filter: url(#metaballs-goo-perfect);
          display: flex;
          background: #111;
          padding: 30px;
          width: fit-content;
          gap: 4px; /* МАКСИМАЛЬНО СБЛИЗИЛИ КНОПКИ ДЛЯ ЖЕСТКОГО СЛИЯНИЯ */
        }
        .meta-node {
          width: 55px; height: 55px; border-radius: 50%; background-color: #252525; border: none; outline: none;
          cursor: pointer; color: #777; font-weight: bold; 
          transition: background-color 0.3s, transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.2);
        }
        .meta-node.active { color: #000; transform: scale(1.35); z-index: 2; }
        
        .meta-node.active.m-1 { background-color: #7000ff; }
        .meta-node.active.m-2 { background-color: #00f0ff; }
        .meta-node.active.m-3 { background-color: #ff007f; }
        .meta-node.active.m-4 { background-color: #ff003c; }
        .meta-node.active.m-5 { background-color: #00ff66; }

        .section { margin-bottom: 60px; }
        .grid { display: flex; gap: 25px; margin-top: 15px; align-items: center; }
        .title { color: #888; font-size: 12px; letter-spacing: 1px; }
      `}</style>

      {/* ======================================================= */}
      {/* ЛАБОРАТОРИЯ 1: БЕСШОВНЫЙ ПЛАВНЫЙ DISPLACEMENT MAPS      */}
      {/* ======================================================= */}
      <div className="section">
        <div className="title">
          LAB 1: PERFECT SMOOTH DISPLACEMENT MORPH (FROM/TO RECTANGLE)
        </div>
        <div
          style={{ color: '#555', fontSize: '11px', margin: '5px 0 15px 0' }}
        >
          * Кнопки активируют фильтр смещения на GPU. Волна нарастает из ровных
          углов и мягко затихает обратно.
        </div>
        <div className="grid">
          {/* Кнопка 1 */}
          <button
            className={`pianoKey-base ${animatingDisp[1] ? 'disp-1' : ''} ${activeDisp[1] ? 'active-disp-1' : ''}`}
            onClick={() => toggleDisp(1)}
          >
            {activeDisp[1] ? 'SOFT' : '1'}
          </button>

          {/* Кнопка 2 */}
          <button
            className={`pianoKey-base ${animatingDisp[2] ? 'disp-2' : ''} ${activeDisp[2] ? 'active-disp-2' : ''}`}
            onClick={() => toggleDisp(2)}
          >
            {activeDisp[2] ? 'MED' : '2'}
          </button>

          {/* Кнопка 3 */}
          <button
            className={`pianoKey-base ${animatingDisp[3] ? 'disp-3' : ''} ${activeDisp[3] ? 'active-disp-3' : ''}`}
            onClick={() => toggleDisp(3)}
          >
            {activeDisp[3] ? 'HARD' : '3'}
          </button>

          {/* Кнопка 4 */}
          <button
            className={`pianoKey-base ${animatingDisp[4] ? 'disp-4' : ''} ${activeDisp[4] ? 'active-disp-4' : ''}`}
            onClick={() => toggleDisp(4)}
          >
            {activeDisp[4] ? 'MELT' : '4'}
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* ЛАБОРАТОРИЯ 2: РАБОЧИЕ СЛИВАЮЩИЕСЯ МЕТАБОЛЛЫ          */}
      {/* ======================================================= */}
      <div className="section">
        <div className="title">
          LAB 2: METABALLS LIQUID CONNECTION (PROPERLY CLOSER DISTANCE)
        </div>
        <div
          style={{ color: '#555', fontSize: '11px', margin: '5px 0 15px 0' }}
        >
          * Включите любые две соседние кнопки (например, 2 и 3). Вы физически
          увидите, как между ними надуется ртутный мостик слияния градиентов.
        </div>

        <div className="metaball-zone">
          <button
            style={{
              transform: `translateX(${getMetaOffset(1)}) ${activeMeta[1] ? 'scale(1.35)' : ''}`,
            }}
            className={`meta-node ${activeMeta[1] ? 'active m-1' : ''}`}
            onClick={() => toggleMeta(1)}
          >
            1
          </button>
          <button
            style={{
              transform: `translateX(${getMetaOffset(2)}) ${activeMeta[2] ? 'scale(1.35)' : ''}`,
            }}
            className={`meta-node ${activeMeta[2] ? 'active m-2' : ''}`}
            onClick={() => toggleMeta(2)}
          >
            2
          </button>
          <button
            style={{
              transform: `translateX(${getMetaOffset(3)}) ${activeMeta[3] ? 'scale(1.35)' : ''}`,
            }}
            className={`meta-node ${activeMeta[3] ? 'active m-3' : ''}`}
            onClick={() => toggleMeta(3)}
          >
            3
          </button>
          <button
            style={{
              transform: `translateX(${getMetaOffset(4)}) ${activeMeta[4] ? 'scale(1.35)' : ''}`,
            }}
            className={`meta-node ${activeMeta[4] ? 'active m-4' : ''}`}
            onClick={() => toggleMeta(4)}
          >
            4
          </button>
          <button
            style={{
              transform: `translateX(${getMetaOffset(5)}) ${activeMeta[5] ? 'scale(1.35)' : ''}`,
            }}
            className={`meta-node ${activeMeta[5] ? 'active m-5' : ''}`}
            onClick={() => toggleMeta(5)}
          >
            5
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerfectFiltersLab;
