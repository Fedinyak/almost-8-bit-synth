import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import SoundParamGroup from './SoundParamGroup';
import {
  SOUND_PARAM_GROUPS,
  UI_EFFECTS_LIST,
  EFFECT_DEVICES,
} from '../../../constants/soundParamsConfig';
import { WaveformMirror } from '../Synths/WaveformMirror';

export const SynthSoundPanel = ({ synthName }) => {
  const synthSettings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  const [activeGroup, setActiveGroup] = useState('envelope');
  const [activeFxTab, setActiveFxTab] = useState('crusher');

  if (!synthSettings) return null;

  return (
    <div
      style={{ padding: '8px', border: '1px solid #444', marginBottom: '10px' }}
      onChange={(e) => {
        const groupDiv = e.target.closest('.sound-param-group-container');
        if (groupDiv?.dataset?.group) {
          setActiveGroup(groupDiv.dataset.group);
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          // justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <strong>{synthName.toUpperCase()} CONTROLS:</strong>
        </div>

        <WaveformMirror
          synthName={synthName}
          activeParamGroup={activeGroup}
          instrumentSettings={synthSettings}
        />
      </div>

      {/* 1. Базовые секции */}
      {SOUND_PARAM_GROUPS.map((group) => (
        <div
          key={group.key}
          className="sound-param-group-container"
          data-group={group.key}
        >
          <SoundParamGroup
            groupKey={group.key}
            title={group.label}
            className={`group-${group.key}`}
            synthName={synthName}
            instrumentSettings={synthSettings}
          />
        </div>
      ))}

      {/* 2. Чистый рэк эффектов без лишних стилей */}
      <div style={{ marginTop: '16px' }}>
        <h6>EFFECTS RACK:</h6>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Сортировка кнопок слева в вертикальный ряд */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {UI_EFFECTS_LIST.map((deviceKey) => {
              const device = EFFECT_DEVICES[deviceKey];
              return (
                <button
                  key={deviceKey}
                  type="button"
                  disabled={activeFxTab === device.groupKey}
                  onClick={() => setActiveFxTab(device.groupKey)}
                >
                  {device.label}
                </button>
              );
            })}
          </div>

          {/* Слайдеры выбранного эффекта справа */}
          <div className="sound-param-group-container" data-group="effects">
            <SoundParamGroup
              groupKey={activeFxTab}
              title={`${activeFxTab.toUpperCase()}:`}
              className={`group-fx-${activeFxTab}`}
              synthName={synthName}
              instrumentSettings={synthSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynthSoundPanel;
