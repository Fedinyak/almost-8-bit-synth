import { useDispatch, useSelector } from "react-redux";
import StepIndicator from "./StepIndicator";
import { toggleDrumStep } from "../../slices/sequencerSlice";
import cn from "classnames";

const SequencerDrumGrid = () => {
  const drumKit = useSelector(state => state.sequencer.drums.drumKit);
  const tracks = useSelector(state => state.sequencer.drums.tracks);
  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);
  const dispatch = useDispatch();

  return (
    <section className="sequencer">
      <div className="sequencer-cells">
        {Array.from({ length: sequencerStep }).map((_, stepIndex) => {
          return (
            <div className="sequencer-cells-row" key={`${stepIndex}-drum-step`}>
              <StepIndicator
                key={`${stepIndex}-step-drum`}
                stepIndex={stepIndex}
              />
              {drumKit.map(drumName => {
                const isActive = tracks[drumName][stepIndex] !== 0;
                const cellStyle = cn("sequencer-cell", {
                  "sequencer-cell-active": isActive,
                });

                return (
                  <button
                    className={cellStyle}
                    onClick={() =>
                      dispatch(
                        toggleDrumStep({ drumName, stepIndex: stepIndex }),
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
