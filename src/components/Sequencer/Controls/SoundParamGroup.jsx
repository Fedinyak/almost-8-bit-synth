import React from 'react';
import AudioParamControl from './AudioParamControl';
import { SOUND_PARAMS } from '../../../constants/soundParamsConfig';

export const SoundParamGroup = ({
  groupKey,
  title,
  className,
  synthName,
  instrumentSettings,
}) => {
  return (
    <div className={className}>
      <h6>{title}</h6>
      {Object.entries(SOUND_PARAMS)
        .filter(([_, config]) => config.group === groupKey)
        .map(([paramKey, paramConfig]) => (
          <AudioParamControl
            key={paramKey}
            synthName={synthName}
            paramName={paramKey}
            config={paramConfig}
            initialValue={instrumentSettings[paramKey]}
          />
        ))}
    </div>
  );
};

export default SoundParamGroup;
