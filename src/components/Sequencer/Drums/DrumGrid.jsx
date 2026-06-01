import React, { useState } from 'react'; // Добавили useState
import { useSelector, useDispatch } from 'react-redux';
import StepIndicator from '../Controls/StepIndicator';
import DrumCell from './DrumCell';
import DrumMonitor from '../../visualizers/DrumMonitor';
import {
  SOUND_PARAM_GROUPS,
  DRUM_TYPE_MAP,
} from '../../../constants/soundParamsConfig';
import SoundParamGroup from '../Controls/SoundParamGroup';
import { setActiveSoundControlDrumTabIndex } from '../../../slices/playerSlice';
import { WaveformMirror } from '../Synths/WaveformMirror'; // Твой импорт

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

  // 🆕 Локальный стейт для слежения за фокусом на барабанах
  const [activeGroup, setActiveGroup] = useState('filter');

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
        // 🆕 Ловим кручение ручек на барабанах
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
                // justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h5 style={{ margin: 0 }}>
                {activeDrumName.toUpperCase()} CHANNEL ({drumTypeName}):
              </h5>

              {/* 🆕 Теперь и на барабанах цвет волны ожил и завязан на activeGroup */}
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
              // Упаковываем группу барабанных параметров
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
          </div>
        )}
      </div>
    </section>
  );
};

export default DrumGrid;
