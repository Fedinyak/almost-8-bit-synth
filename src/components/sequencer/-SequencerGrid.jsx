import { useSelector } from "react-redux";
import Cell from "./OptimizedCell";
// import { STEPS_PER_PAGE } from "../store/sequencerSlice";
import { STEPS_PER_PAGE } from "../../slices/sequencerSlice";

const SequencerGrid = () => {
  // Индексы для текущей страницы (32 шага)
  const visibleNotesCount = useSelector(
    state => state.sequencer.visibleNotesCount,
  );
  const viewPage = useSelector(state => state.sequencer.viewPage);
  const startStep = viewPage * STEPS_PER_PAGE;

  const steps = Array.from({ length: STEPS_PER_PAGE }, (_, i) => startStep + i);
  const notes = Array.from({ length: visibleNotesCount }, (_, i) => i);

  return (
    <div
      className="sequencer-grid"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {steps.map(stepIndex => (
        <div key={stepIndex} style={{ display: "flex" }}>
          {notes.map(relNoteIndex => (
            <Cell
              key={`${relNoteIndex}-${stepIndex}`}
              relativeNoteIndex={relNoteIndex}
              stepIndex={stepIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SequencerGrid;
