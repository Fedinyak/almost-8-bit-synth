import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateSynthParam } from '../../../slices/soundSettingsSlice';
import { SOUND_PARAMS } from '../../../constants/soundParamsConfig';
import { LfoOscilloscope } from './LfoOscilloscope';

export const LfoModulationPanel = ({ synthName }) => {
  const dispatch = useDispatch();

  const instrumentSettings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  if (!instrumentSettings) return null;

  const isActive = instrumentSettings.lfoActive ?? false;
  const currentRate = instrumentSettings.lfoRate ?? 5.0;
  const currentDepth = instrumentSettings.lfoDepth ?? 0.5;
  const currentWaveform = instrumentSettings.lfoWaveform ?? 'sine';
  const currentTarget = instrumentSettings.lfoTarget ?? 'filterLowpassCutoff';

  const availableTargets = Object.entries(SOUND_PARAMS)
    .filter(([paramKey, paramConfig]) => {
      const currentEngineType = instrumentSettings.engineType || 'monoSynth';
      if (
        paramConfig.supportedEngines &&
        !paramConfig.supportedEngines.includes(currentEngineType)
      ) {
        return false;
      }
      return true;
    })
    .map(([paramKey, paramConfig]) => ({
      key: paramKey,
      label: paramConfig.label || paramKey,
    }));

  const handleParamChange = (paramName, value) => {
    dispatch(updateSynthParam({ synthName, paramName, value }));
  };

  return (
    <div className="lfo-modulator-panel">
      <div>
        <div>LFO VISUALIZER:</div>
        {/* Статичный холст 200x100 */}
        <LfoOscilloscope
          isActive={isActive}
          depth={currentDepth}
          waveform={currentWaveform}
          rate={currentRate}
        />
      </div>

      <div>
        <button
          type="button"
          disabled={isActive}
          onClick={() => handleParamChange('lfoActive', true)}
        >
          ON
        </button>
        <button
          type="button"
          disabled={!isActive}
          onClick={() => handleParamChange('lfoActive', false)}
        >
          OFF
        </button>
      </div>

      <div>
        <label>SHAPE:</label>
        <select
          value={currentWaveform}
          onChange={(e) => handleParamChange('lfoWaveform', e.target.value)}
        >
          <option value="sine">SINE</option>
          <option value="square">SQUARE</option>
          <option value="sawtooth">SAW</option>
          <option value="triangle">TRI</option>
        </select>
      </div>

      <div>
        <label>RATE:</label>
        <input
          type="range"
          min="0.1"
          max="20.0"
          step="0.1"
          value={currentRate}
          onChange={(e) => handleParamChange('lfoRate', Number(e.target.value))}
        />
        <span>{currentRate.toFixed(1)} Hz</span>
      </div>

      <div>
        <label>DEPTH:</label>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.05"
          value={currentDepth}
          onChange={(e) =>
            handleParamChange('lfoDepth', Number(e.target.value))
          }
        />
        <span>{Math.round(currentDepth * 100)}%</span>
      </div>

      <div>
        <label>TARGET:</label>
        <select
          value={currentTarget}
          onChange={(e) => handleParamChange('lfoTarget', e.target.value)}
        >
          {availableTargets.map((target) => (
            <option key={target.key} value={target.key}>
              {target.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LfoModulationPanel;
