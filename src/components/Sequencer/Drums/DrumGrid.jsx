import React from 'react';
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

  // Прямое, моментальное и безопасное чтение строки из конфига
  const drumTypeName = DRUM_TYPE_MAP[activeDrumName] || 'Synth';

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

      <div className="drum-mixer-panel">
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
            <h5>
              {activeDrumName.toUpperCase()} CHANNEL ({drumTypeName}):
            </h5>

            {SOUND_PARAM_GROUPS.map((group) => (
              <SoundParamGroup
                key={`${activeDrumName}-${group.key}`}
                groupKey={group.key}
                title={group.label}
                className={`drum-group-${group.key}`}
                synthName={activeDrumName}
                instrumentSettings={activeDrumSettings}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DrumGrid;
