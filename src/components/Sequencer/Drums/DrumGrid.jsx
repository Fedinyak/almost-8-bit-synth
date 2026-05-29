import React from 'react';
import { useSelector } from 'react-redux';
import StepIndicator from '../Controls/StepIndicator';
import DrumCell from './DrumCell';
import DrumMonitor from '../../visualizers/DrumMonitor';
import { SOUND_PARAMS } from '../../../constants/soundParamsConfig';
import AudioParamControl from '../Controls/AudioParamControl';

const DrumGrid = () => {
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

        {drumKit.map((drumName) => {
          const settings = soundSettings[drumName] || {};

          return (
            <div key={`${drumName}-channel`}>
              <h5>{drumName.toUpperCase()}:</h5>

              <div className="drum-group-envelope">
                <h6>ENVELOPE:</h6>
                {Object.entries(SOUND_PARAMS)
                  .filter(([_, config]) => config.group === 'envelope')
                  .map(([paramKey, paramConfig]) => (
                    <AudioParamControl
                      key={`${drumName}-${paramKey}`}
                      synthName={drumName}
                      paramName={paramKey}
                      config={paramConfig}
                      initialValue={settings[paramKey]}
                    />
                  ))}
              </div>

              <div className="drum-group-effects">
                <h6>EFFECTS:</h6>
                {Object.entries(SOUND_PARAMS)
                  .filter(([_, config]) => config.group === 'effects')
                  .map(([paramKey, paramConfig]) => (
                    <AudioParamControl
                      key={`${drumName}-${paramKey}`}
                      synthName={drumName}
                      paramName={paramKey}
                      config={paramConfig}
                      initialValue={settings[paramKey]}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DrumGrid;
