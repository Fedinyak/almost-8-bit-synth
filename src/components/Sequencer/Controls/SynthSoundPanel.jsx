import React from 'react';
import { useSelector } from 'react-redux';
import SoundParamGroup from './SoundParamGroup';
import { SOUND_PARAM_GROUPS } from '../../../constants/soundParamsConfig';

export const SynthSoundPanel = ({ synthName }) => {
  const synthSettings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  return (
    <div
      style={{ padding: '8px', border: '1px solid #444', marginBottom: '10px' }}
    >
      <div>
        <strong>{synthName.toUpperCase()} CONTROLS:</strong>
      </div>

      {SOUND_PARAM_GROUPS.map((group) => (
        <SoundParamGroup
          key={group.key}
          groupKey={group.key}
          title={group.label}
          className={`group-${group.key}`}
          synthName={synthName}
          instrumentSettings={synthSettings}
        />
      ))}
    </div>
  );
};

export default SynthSoundPanel;
