import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux'; // Добавили useDispatch
import SoundParamGroup from './SoundParamGroup';
import { updateSynthParam } from '../../../slices/soundSettingsSlice'; // Импортируем твой экшен обновления стейта
import {
  SOUND_PARAM_GROUPS,
  UI_EFFECTS_LIST,
  EFFECT_DEVICES,
} from '../../../constants/soundParamsConfig';
import { WaveformMirror } from '../Synths/WaveformMirror';
import LfoModulationPanel from './LfoModulationPanel';

export const SynthSoundPanel = ({ synthName }) => {
  const dispatch = useDispatch();

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
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}
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

      {/* 2. Модульный рэк эффектов с кнопками ON / OFF */}
      <div style={{ marginTop: '16px' }}>
        <h6>EFFECTS RACK:</h6>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Вертикальный стек приборов слева */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {UI_EFFECTS_LIST.map((deviceKey) => {
              const device = EFFECT_DEVICES[deviceKey];
              const isTabSelected = activeFxTab === device.groupKey;

              // Читаем живой статус активности этого эффекта из Редакса (true/false)
              const isEffectOn = synthSettings[device.activeKey] !== false;

              return (
                <div
                  key={deviceKey}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {/* Кнопка-таб для выбора и открытия ручек эффекта */}
                  <button
                    type="button"
                    disabled={isTabSelected}
                    onClick={() => setActiveFxTab(device.groupKey)}
                    style={{ minWidth: '110px', textAlign: 'left' }}
                  >
                    {device.label}
                  </button>

                  {/* Кнопка ON: активна, горит красным, если эффект включен */}
                  <button
                    type="button"
                    disabled={isEffectOn} // Дизейблим, если уже включен
                    onClick={() =>
                      dispatch(
                        updateSynthParam({
                          synthName,
                          paramName: device.activeKey,
                          value: true,
                        }),
                      )
                    }
                    style={{
                      backgroundColor: isEffectOn ? 'red' : 'transparent',
                      color: isEffectOn ? 'white' : 'inherit',
                    }}
                  >
                    ON
                  </button>

                  {/* Кнопка OFF: обычная серая, утапливается (disabled) при выключении */}
                  <button
                    type="button"
                    disabled={!isEffectOn} // Дизейблим, если уже выключен
                    onClick={() =>
                      dispatch(
                        updateSynthParam({
                          synthName,
                          paramName: device.activeKey,
                          value: false,
                        }),
                      )
                    }
                  >
                    OFF
                  </button>
                </div>
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
          <LfoModulationPanel synthName={synthName} />
        </div>
      </div>
    </div>
  );
};

export default SynthSoundPanel;
