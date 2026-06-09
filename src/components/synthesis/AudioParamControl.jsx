import React from 'react';
import { useDispatch } from 'react-redux';
import { updateSynthParam } from '../../slices/soundSettingsSlice';
import { TEXT_PARAM_DICTIONARIES } from '../../constants/soundParamsConfig';
import { synthEnginesRegistry } from '../../utility/visualizerState';

export const AudioParamControl = ({
  synthName,
  paramName,
  config,
  initialValue,
  instrumentSettings,
}) => {
  const dispatch = useDispatch();

  const sliderValue = initialValue ?? config.defaultValue ?? 0;

  const targetDictionary =
    config.isTextParam && config.dictionaryKey
      ? TEXT_PARAM_DICTIONARIES[config.dictionaryKey]
      : null;

  const hasBypassIndicator =
    config.isEffect && typeof config.bypassValue === 'number';

  const isEffectActive = hasBypassIndicator
    ? sliderValue !== config.bypassValue
    : false;

  const currentEngineType = instrumentSettings?.engineType || 'monoSynth';

  const isParamDisabled = config.supportedEngines
    ? !config.supportedEngines.includes(currentEngineType)
    : false;

  // ============================================================================
  // ЛОГИКА РАСЧЕТА ГЕОМЕТРИЧЕСКОГО КОРИДОРА МОДУЛЯЦИИ LFO
  // ============================================================================
  const isLfoActive = instrumentSettings?.lfoActive ?? false;
  const lfoTarget = instrumentSettings?.lfoTarget ?? '';
  const lfoDepth = instrumentSettings?.lfoDepth ?? 0.0;

  const isTargetOfCurrentLfo =
    isLfoActive && lfoTarget === paramName && !isParamDisabled;

  let indicatorLeft = '0%';
  let indicatorWidth = '0%';

  if (isTargetOfCurrentLfo) {
    const min = config.min ?? 0;
    const max = config.max ?? 1;
    const range = max - min;

    const currentPercent = range > 0 ? (sliderValue - min) / range : 0;

    const maxModulationSpan = 0.5;
    const currentSpan = Math.abs(lfoDepth) * maxModulationSpan;

    const leftBound = Math.max(0, currentPercent - currentSpan);
    const rightBound = Math.min(1, currentPercent + currentSpan);

    indicatorLeft = `${leftBound * 100}%`;
    indicatorWidth = `${(rightBound - leftBound) * 100}%`;
  }

  const handleChange = (e) => {
    if (isParamDisabled) return;
    const newValue = Number(e.target.value);

    dispatch(updateSynthParam({ synthName, paramName, value: newValue }));

    if (targetDictionary) {
      const synthInstance = synthEnginesRegistry
        ? synthEnginesRegistry[synthName]
        : null;
      const fxNode = synthInstance ? synthInstance[config.nodeKey] : null;

      if (fxNode) {
        const audioStringValue = targetDictionary.audioValues[newValue];

        if (audioStringValue !== undefined) {
          fxNode.set({
            [config.targetParam]: audioStringValue,
          });
        }
      }
    }
  };

  return (
    <div
      className="audio-param-control-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: '6px 0',
        gap: '8px',
        opacity: isParamDisabled ? 0.4 : 1,
        pointerEvents: isParamDisabled ? 'none' : 'auto',
      }}
    >
      {hasBypassIndicator && (
        <div
          className="bypass-status-lamp"
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
        className="param-control-label"
        style={{
          display: 'inline-block',
          width: '150px',
          fontSize: '12px',
          marginLeft: hasBypassIndicator ? '0' : '16px',
          color: isParamDisabled ? '#777777' : 'inherit',
        }}
      >
        {config.label}:
      </label>

      {/* Обертка-контейнер для послойного наложения по оси Z */}
      <div
        className="param-slider-wrapper"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: '150px',
          height: '20px',
        }}
      >
        {/* АБСОЛЮТНО ДЕФОЛТНЫЙ ИНПУТ. Синий и белый цвета Хрома на месте. Лежит на Z-слое 1 */}
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={sliderValue}
          onChange={handleChange}
          disabled={isParamDisabled}
          style={{
            width: '100%',
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Плотная зеленая полоса LFO модуляции. Лежит по оси Z НАД рельсой инпута (zIndex: 2) */}
        {isTargetOfCurrentLfo && (
          <div
            className="lfo-modulation-corridor"
            style={{
              position: 'absolute',
              height: '4px', // Делаем чуть тоньше, чтобы она перекрывала только саму колею, не закрывая кружок
              backgroundColor: '#006600', // Наш сочный темно-зеленый
              pointerEvents: 'none', // Пропускает клики насквозь на слайдер ниже
              left: indicatorLeft,
              width: indicatorWidth,
              zIndex: 2, // ВЫШЕ инпута по оси Z
            }}
          />
        )}
      </div>

      <span
        className="param-value-display"
        style={{
          marginLeft: '8px',
          fontFamily: 'monospace',
          color: isParamDisabled ? '#777777' : 'inherit',
        }}
      >
        {targetDictionary
          ? (targetDictionary.options[sliderValue] ?? 'error')
          : typeof sliderValue === 'number'
            ? sliderValue.toFixed(3)
            : '0.000'}
      </span>
    </div>
  );
};

export default AudioParamControl;
