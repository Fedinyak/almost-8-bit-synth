import { useDispatch, useSelector } from "react-redux";
import StepIndicator from "./StepIndicator";
import noteAndKeyMap from "../../constants.js/noteAndKeyMap";
import { toggleDrumStep } from "../../slices/sequencerSlice";

const SequencerDrumGrid = () => {
  const drumKit = useSelector(state => state.sequencer.drums.drumKit);
  const sequencerNoteGrid = useSelector(
    state => state.sequencer.drums.sequencerNoteGrid,
  );
  const tracks = useSelector(state => state.sequencer.drums.tracks);
  // const sequencerDrumNote = useSelector(state => state.sequencer)

  const drumNoteMap = noteAndKeyMap.drumNoteMap;

  const dispatch = useDispatch();
  //  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);

  return (
    <section className="sequencer">
      <div className="sequencer-cells">
        {sequencerNoteGrid.map((item, stepIndex) => {
          return (
            <div className="sequencer-cells-row" key={`${stepIndex}-drum-step`}>
              {/* <StepIndicator key={`${i}-step-drum`} stepIndex={i} />
              {drumKit.map(drumName => (
                <div key={drumName} className="drum-row">
                  <span>{drumName}</span>
                  {tracks[drumName].map((isHit, index) => (
                    <button
                      onClick={() =>
                        dispatch(toggleDrumStep({ drumName, stepIndex: index }))
                      }
                      className={isHit ? "active" : ""}
                    />
                  ))}
                </div>
              ))} */}
              {drumKit.map(drumName => {
                const isActive = tracks[drumName][stepIndex] !== 0;
                return (
                  <button
                    style={{
                      width: "80px",
                      height: "30px",
                      overflow: "hidden",
                    }}
                    onClick={() =>
                      dispatch(
                        toggleDrumStep({ drumName, stepIndex: stepIndex }),
                      )
                    }
                    key={`${drumName}-${stepIndex}`}
                  >
                    {isActive ? "A" : ""}
                    {tracks[drumName][stepIndex]}
                    {drumName}
                    {stepIndex}
                    {drumNoteMap[drumName]}
                  </button>
                  // <Cell
                  //   className="sequencer-cell"
                  //   key={`${instrument}-${drum}-${i}}`}
                  //   instrument={instrument}
                  //   note={getNote(letter, octave, noteMap, octaveMap)}
                  //   sequencerActiveNote={
                  //     instrumentsData[instrument].sequencerNoteGrid[i]
                  //   }
                  //   step={i}
                  // />
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
