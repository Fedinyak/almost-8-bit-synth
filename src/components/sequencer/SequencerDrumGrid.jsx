import { useDispatch, useSelector } from 'react-redux';
import StepIndicator from './StepIndicator';
import { toggleDrumStep } from '../../slices/patternsSlice';
import cn from 'classnames';

const SequencerDrumGrid = () => {
  const dispatch = useDispatch();

  const drumKit = useSelector((state) => state.patterns.drumKitList);
  const tracks = useSelector((state) => state.patterns.drumsData.patterns);
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

  return (
    <section className="sequencer">
      <h3>isFollowMode {`${isFollowMode}`}</h3>
      <div className="sequencer-cells">
        {Array.from({ length: sequencerStep }).map((_, stepIndex) => {
          return (
            <div className="sequencer-cells-row" key={`${stepIndex}-drum-step`}>
              <StepIndicator
                key={`${stepIndex}-step-drum`}
                stepIndex={stepIndex}
              />
              {drumKit.map((drumName) => {
                const isActive =
                  tracks[activeVisualPattern][drumName][stepIndex] !== 0;

                const cellStyle = cn('sequencer-cell', {
                  'sequencer-cell-active': isActive,
                });

                // console.log(currentPattern, 'currentPattern');
                return (
                  <button
                    className={cellStyle}
                    onClick={() =>
                      dispatch(
                        toggleDrumStep({
                          drumName,
                          stepIndex,
                          patternIndex: activeVisualPattern,
                        }),
                      )
                    }
                    key={`${drumName}-${stepIndex}`}
                  >
                    {/* {tracks[drumName][stepIndex]} */}
                    {drumName[0]}
                    {/* {stepIndex} */}
                    {/* {drumNoteMap[drumName]} */}
                  </button>
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

export default SequencerDrumGrid;
