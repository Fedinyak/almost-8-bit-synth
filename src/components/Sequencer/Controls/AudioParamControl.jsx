import React from 'react';
import { useDispatch } from 'react-redux';
import { updateSynthParam } from '../../../slices/soundSettingsSlice';

export const AudioParamControl = ({
  synthName,
  paramName,
  config,
  initialValue,
  instrumentSettings, // Передаем весь объект настроек, чтобы прочитать engineType
}) => {
  const dispatch = useDispatch();

  const sliderValue = initialValue ?? config.defaultValue ?? 0;

  // Индикатор рендерится ТОЛЬКО для главных ручек эффектов, которые управляют байпасом (у них есть bypassValue)
  const hasBypassIndicator =
    config.isEffect && typeof config.bypassValue === 'number';

  // Логика активности лампочки: горит, если текущее значение не равно значению усыпления (bypassValue)
  const isEffectActive = hasBypassIndicator
    ? sliderValue !== config.bypassValue
    : false;

  // 🧱 АБСОЛЮТНО ЧЕСТНЫЙ DATA-DRIVEN ДИЗЕЙБЛ:
  // Извлекаем тип движка текущего прибора ('monoSynth', 'metalSynth' и т.д.)
  const currentEngineType = instrumentSettings?.engineType || 'monoSynth';

  // Ручка блокируется, если в её массиве supportedEngines нет типа текущего движка
  const isParamDisabled = config.supportedEngines
    ? !config.supportedEngines.includes(currentEngineType)
    : false;

  const handleChange = (e) => {
    if (isParamDisabled) return;
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
        opacity: isParamDisabled ? 0.4 : 1,
        pointerEvents: isParamDisabled ? 'none' : 'auto',
      }}
    >
      {/* Лампочка рендерится только у 4 главных управляющих ручек */}
      {hasBypassIndicator && (
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor:
              isEffectActive && !isParamDisabled ? '#00ff00' : '#555555',
            boxShadow:
              isEffectActive && !isParamDisabled ? '0 0 6px #00ff00' : 'none',
            flexShrink: 0,
          }}
        />
      )}

      <label
        style={{
          display: 'inline-block',
          width: '100px',
          // Если лампочки нет, делаем отступ в 16px (8px ширина лампочки + 8px gap), чтобы выровнять текст всех ручек в один ряд
          marginLeft: hasBypassIndicator ? '0' : '16px',
          color: isParamDisabled ? '#777777' : 'inherit',
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
        disabled={isParamDisabled}
      />

      <span
        style={{
          marginLeft: '8px',
          fontFamily: 'monospace',
          color: isParamDisabled ? '#777777' : 'inherit',
        }}
      >
        {typeof sliderValue === 'number' ? sliderValue.toFixed(3) : '0.000'}
      </span>
    </div>
  );
};

export default AudioParamControl;
