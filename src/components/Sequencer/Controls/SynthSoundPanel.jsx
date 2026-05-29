import React from 'react';
import { useSelector } from 'react-redux';
import AudioParamControl from './AudioParamControl';
import { SOUND_PARAMS } from '../../../constants/soundParamsConfig';

export const SynthSoundPanel = ({ synthName }) => {
  const synthSettings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  if (!synthSettings) return null;

  return (
    <div
      style={{ padding: '8px', border: '1px solid #444', marginBottom: '10px' }}
    >
      <div>
        <strong>{synthName.toUpperCase()} CONTROLS:</strong>
      </div>

      {Object.entries(SOUND_PARAMS).map(([paramKey, paramConfig]) => (
        <AudioParamControl
          key={paramKey}
          synthName={synthName}
          paramName={paramKey}
          config={paramConfig}
          initialValue={synthSettings[paramKey]}
        />
      ))}
    </div>
  );
};

export default SynthSoundPanel;
