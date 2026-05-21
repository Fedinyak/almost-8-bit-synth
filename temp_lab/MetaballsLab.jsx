import React, { useState } from 'react';

const MetaballsLab = () => {
  // Состояния нажатия для трех соседних кнопок шагов секвенсора
  const [step1, setStep1] = useState(false);
  const [step2, setStep2] = useState(false);
  const [step3, setStep3] = useState(false);

  return (
    <div
      style={{
        padding: '40px',
        background: '#111',
        minHeight: '40vh',
        fontFamily: 'monospace',
      }}
    >
      {/* 1. МАТЕМАТИЧЕСКИЙ ФИЛЬТР КОНТРАСТА АЛЬФА-КАНАЛА */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="metaball-gooey">
            {/* Размываем элементы внутри контейнера */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            {/* Выкручиваем контраст прозрачности на максимум: коэффициент 18 склеивает пиксели */}
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 18 -7"
              result="goo"
            />
            {/* Возвращаем оригинальное четкое содержимое поверх склеенного фона */}
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <style>{`
        /* Контейнер, внутри которого включен эффект жидкого притягивания элементов */
        .gooey-container {
          filter: url(#metaball-gooey);
          display: flex;
          gap: 15px; /* Зазор между кнопками. Если зазор небольшой, они будут магнититься */
          background: #111;
          padding: 20px;
        }

        .step-node {
          width: 50px; height: 50px; border-radius: 50%; /* С круглыми кнопками эффект выглядит как ртуть */
          background-color: #333; border: none; outline: none;
          cursor: pointer; color: #aaa; font-weight: bold;
          transition: background-color 0.3s, transform 0.2s;
        }

        /* Когда шаги активны, они увеличиваются и их размытые края сливаются друг с другом */
        .step-node.active {
          background-color: #00f0ff;
          color: #000;
          transform: scale(1.25); /* Увеличение заставляет жидкие края перекрывать соседа */
          box-shadow: 0 0 10px #00f0ff;
        }
        .label { color: #888; font-size: 11px; margin-bottom: 10px; }
      `}</style>

      <div className="label">
        LAB 2: METABALLS EFFECT (CONNECTED STEP SEQUENCER NODES)
      </div>

      {/* Все кнопки внутри этого дива будут физически "магнититься" и сливаться краями при активации */}
      <div className="gooey-container">
        <button
          className={`step-node ${step1 ? 'active' : ''}`}
          onClick={() => setStep1(!step1)}
        >
          1
        </button>
        <button
          className={`step-node ${step2 ? 'active' : ''}`}
          onClick={() => setStep2(!step2)}
        >
          2
        </button>
        <button
          className={`step-node ${step3 ? 'active' : ''}`}
          onClick={() => setStep3(!step3)}
        >
          3
        </button>
      </div>

      <div style={{ color: '#555', fontSize: '11px', marginTop: '15px' }}>
        * Активируйте шаги 1 и 2 одновременно, чтобы увидеть, как они сольются в
        единую каплю ртути.
      </div>
    </div>
  );
};

export default MetaballsLab;
