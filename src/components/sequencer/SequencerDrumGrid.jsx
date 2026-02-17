import { useSelector } from "react-redux";
import StepIndicator from "./StepIndicator";
import noteAndKeyMap from "../../constants.js/noteAndKeyMap";

const SequencerDrumGrid = () => {
  const drumKit = useSelector(state => state.sequencer.drums.drumKit);
  const sequencerNoteGrid = useSelector(
    state => state.sequencer.drums.sequencerNoteGrid,
  );
  const drumNoteMap = noteAndKeyMap.drumNoteMap;
  //  const sequencerStep = useSelector(state => state.sequencer.sequencerStep);

  return (
    <section className="sequencer">
      <div className="sequencer-cells">
        {sequencerNoteGrid.map((item, i) => {
          return (
            <div className="sequencer-cells-row" key={`${i}-drum-step`}>
              <StepIndicator key={`${i}-step-drum`} stepIndex={i} />
              {drumKit.map(drum => {
                const isActive =
                  sequencerNoteGrid[i].note === drumNoteMap[drum];
                return (
                  <button
                    style={{
                      width: "80px",
                      height: "30px",
                      overflow: "hidden",
                    }}
                    key={`${drum}-${i}`}
                  >
                    {isActive ? "OOO" : ""}
                    {drum}
                    {i}
                    {drumNoteMap[drum]}
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
