import { useSelector } from 'react-redux';
import StepIndicator from './StepIndicator';
import DrumCell from './DrumCell';

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

  return (
    <section className="sequencer">
      <h3>isFollowMode {`${isFollowMode}`}</h3>
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
    </section>
  );
};

export default DrumGrid;
