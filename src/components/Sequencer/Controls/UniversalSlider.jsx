import React from 'react';
import { useDispatch } from 'react-redux';
import { updateSynthParam } from '../../../slices/soundSettingsSlice';

export const UniversalSlider = ({
  synthName,
  paramName,
  config,
  initialValue,
}) => {
  const dispatch = useDispatch();

  const handleChange = (e) => {
    const newValue = Number(e.target.value);

    // Мгновенно обновляем Redux. Стейт плоский, поэтому лагов не будет,
    // а хук синхронизации сразу получит актуальное число.
    dispatch(updateSynthParam({ synthName, paramName, value: newValue }));
  };

  return (
    <div style={{ margin: '4px 0', fontFamily: 'monospace' }}>
      <label style={{ display: 'inline-block', width: '100px' }}>
        {config.label}:
      </label>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={initialValue} // Управляемый компонент: читает число напрямую из Redux
        onChange={handleChange}
      />
      <span style={{ marginLeft: '8px' }}>{initialValue.toFixed(3)}</span>
    </div>
  );
};

export default UniversalSlider;
