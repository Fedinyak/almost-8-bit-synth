import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import StepIndicator from '../Controls/StepIndicator';
import DrumCell from './DrumCell';
import DrumMonitor from '../../visualizers/DrumMonitor';
import { updateSynthParam } from '../../../slices/soundSettingsSlice';
import {
  SOUND_PARAM_GROUPS,
  DRUM_TYPE_MAP,
  UI_EFFECTS_LIST,
  EFFECT_DEVICES,
} from '../../../constants/soundParamsConfig';
import SoundParamGroup from '../Controls/SoundParamGroup';
import { setActiveSoundControlDrumTabIndex } from '../../../slices/playerSlice';
import { WaveformMirror } from '../Synths/WaveformMirror';
import { LfoModulationPanel } from '../Controls/LfoModulationPanel';

const DrumGrid = () => {
  const dispatch = useDispatch();

  const drumKit = useSelector((state) => state.patterns.drumKitList);
  const isFollowMode = useSelector((state) => state.player.isFollowMode);

  const currentPlayPattern = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );
  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );

  const activeVisualPattern = isFollowMode
    ? currentPlayPattern
    : selectedPatternIndex;

  const sequencerStep = useSelector((state) => state.player.sequencerStep);
  const steps = Array.from({ length: sequencerStep }, (_, i) => i);

  const soundSettings = useSelector(
    (state) => state.soundSettings?.synths || {},
  );

  const activeDrumIndex = useSelector(
    (state) => state.player.activeSoundControlDrumTabIndex,
  );

  const activeDrumName = drumKit[activeDrumIndex];

  const activeDrumSettings = activeDrumName
    ? soundSettings[activeDrumName]
    : {};

  const drumTypeName = DRUM_TYPE_MAP[activeDrumName] || 'Synth';

  const [activeGroup, setActiveGroup] = useState('filter');
  const [activeFxTab, setActiveFxTab] = useState('crusher');

  return (
    <section className="sequencer">
      <h3>isFollowMode {`${isFollowMode}`}</h3>
      <DrumMonitor />

      <div className="sequencer-cells">
        {steps.map((stepIndex) => {
          return (
            <div className="sequencer-cells-row" key={`${stepIndex}-drum-step`}>
              <StepIndicator
                key={`${stepIndex}-step-drum`}
                stepIndex={stepIndex}
              />

              {drumKit.map((drumName) => {
                return (
                  <DrumCell
                    key={`${drumName}-${stepIndex}`}
                    drumName={drumName}
                    stepIndex={stepIndex}
                    activeVisualPattern={activeVisualPattern}
                  />
                );
              })}
              <br />
            </div>
          );
        })}
      </div>

      <div
        className="drum-mixer-panel"
        onChange={(e) => {
          const groupDiv = e.target.closest('.drum-param-group-container');
          if (groupDiv?.dataset?.group) {
            setActiveGroup(groupDiv.dataset.group);
          }
        }}
      >
        <h4>DRUM CONTROLS:</h4>

        <div
          className="drum-tab-selectors"
          style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
        >
          {drumKit.map((drumName, index) => (
            <button
              key={`${drumName}-tab-btn`}
              disabled={activeDrumIndex === index}
              onClick={() => dispatch(setActiveSoundControlDrumTabIndex(index))}
            >
              {drumName.toUpperCase()}
            </button>
          ))}
        </div>

        {activeDrumName && (
          <div key={`${activeDrumName}-channel-active`}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h5 style={{ margin: 0 }}>
                {activeDrumName.toUpperCase()} CHANNEL ({drumTypeName}):
              </h5>

              <WaveformMirror
                synthName={activeDrumName}
                activeParamGroup={activeGroup}
                instrumentSettings={{
                  ...activeDrumSettings,
                  oscillatorType: drumTypeName,
                }}
              />
            </div>

            {SOUND_PARAM_GROUPS.map((group) => (
              <div
                key={`${activeDrumName}-${group.key}`}
                className="drum-param-group-container"
                data-group={group.key}
              >
                <SoundParamGroup
                  groupKey={group.key}
                  title={group.label}
                  className={`drum-group-${group.key}`}
                  synthName={activeDrumName}
                  instrumentSettings={activeDrumSettings}
                />
              </div>
            ))}

            <div style={{ marginTop: '16px' }}>
              <h6>EFFECTS RACK:</h6>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {UI_EFFECTS_LIST.map((deviceKey) => {
                    const device = EFFECT_DEVICES[deviceKey];
                    const isTabSelected = activeFxTab === device.groupKey;

                    const isEffectOn =
                      activeDrumSettings[device.activeKey] !== false;

                    return (
                      <div
                        key={deviceKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <button
                          type="button"
                          disabled={isTabSelected}
                          onClick={() => setActiveFxTab(device.groupKey)}
                          style={{ minWidth: '110px', textAlign: 'left' }}
                        >
                          {device.label}
                        </button>

                        <button
                          type="button"
                          disabled={isEffectOn}
                          onClick={() =>
                            dispatch(
                              updateSynthParam({
                                synthName: activeDrumName,
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

                        <button
                          type="button"
                          disabled={!isEffectOn}
                          onClick={() =>
                            dispatch(
                              updateSynthParam({
                                synthName: activeDrumName,
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

                <div
                  className="drum-param-group-container"
                  data-group="effects"
                >
                  <SoundParamGroup
                    groupKey={activeFxTab}
                    title={`${activeFxTab.toUpperCase()}:`}
                    className={`drum-group-fx-${activeFxTab}`}
                    synthName={activeDrumName}
                    instrumentSettings={activeDrumSettings}
                  />
                </div>
              </div>
            </div>

            {/* 🆕 ВРЕЗАЕМ ГОЛУЮ ПАНЕЛЬ LFO В САМЫЙ НИЗ АКТИВНОГО БАРАБАННОГО КАНАЛА */}
            <LfoModulationPanel synthName={activeDrumName} />
          </div>
        )}
      </div>
    </section>
  );
};

export default DrumGrid;
