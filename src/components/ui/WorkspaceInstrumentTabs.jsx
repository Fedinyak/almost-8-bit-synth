import React from 'react';
import { SYNTH_PRESETS } from '../../constants/soundParamsConfig';

export const WorkspaceInstrumentTabs = ({
  tabs,
  activeTabIndex,
  onTabClick,
}) => {
  return (
    <div className="workspace-tabs">
      {tabs.map((tabName, index) => {
        const synthPreset = SYNTH_PRESETS[tabName];
        const buttonText = synthPreset?.oscillatorType
          ? `${tabName.toUpperCase()} (${synthPreset.oscillatorType})`
          : tabName.toUpperCase();

        return (
          <button
            key={tabName}
            disabled={activeTabIndex === index}
            onClick={() => onTabClick(index)}
          >
            {buttonText}
          </button>
        );
      })}
    </div>
  );
};

export default WorkspaceInstrumentTabs;
