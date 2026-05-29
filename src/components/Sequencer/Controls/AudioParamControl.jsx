import React from 'react';
import { useDispatch } from 'react-redux';
import { updateSynthParam } from '../../../slices/soundSettingsSlice';

export const AudioParamControl = ({
  synthName,
  paramName,
  config,
  initialValue,
}) => {
  const dispatch = useDispatch();

  // Железный предохранитель от undefined на случай расширения паспорта
  const sliderValue = initialValue ?? config.defaultValue ?? 0;

  // ДИНАМИЧЕСКИЙ РАСЧЕТ ИНДИКАТОРА СТРОГО ПО ПАСПОРТУ:
  // Проверяем, помечен ли параметр в паспорте как аудио-эффект
  const isEffect = config.isEffect && config.nodeKey;

  // Берем точное граничное значение из конфига (если вдруг забыли прописать — фолбек в 0)
  const bypassTarget =
    typeof config.bypassValue === 'number' ? config.bypassValue : 0;

  // Эффект активен, только если его текущее живое число ушло с точки выключения из паспорта
  const isEffectActive = isEffect ? sliderValue !== bypassTarget : false;

  const handleChange = (e) => {
    const newValue = Number(e.target.value);
    dispatch(updateSynthParam({ synthName, paramName, value: newValue }));
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: '6px 0',
        gap: '8px',
      }}
    >
      {/* 🟩 ПИКСЕЛЬНЫЙ ИНДИКАТОР АКТИВНОСТИ ЭФФЕКТА */}
      {isEffect && (
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: isEffectActive ? '#00ff00' : '#555555',
            boxShadow: isEffectActive ? '0 0 6px #00ff00' : 'none',
            flexShrink: 0,
          }}
        />
      )}

      {/* Выравниваем лейблы параметров без лампочки (Атака), чтобы сетка в UI не съезжала */}
      <label
        style={{
          display: 'inline-block',
          width: '100px',
          marginLeft: isEffect ? '0' : '16px',
        }}
      >
        {config.label}:
      </label>

      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={sliderValue}
        onChange={handleChange}
      />

      <span style={{ marginLeft: '8px', fontFamily: 'monospace' }}>
        {typeof sliderValue === 'number' ? sliderValue.toFixed(3) : '0.000'}
      </span>
    </div>
  );
};

export default AudioParamControl;
