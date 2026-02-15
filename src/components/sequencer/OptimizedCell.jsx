import { memo } from "react";
import { useSelector, useDispatch } from "react-redux";
// import { toggleNote } from "../store/sequencerSlice";
import { toggleStep } from "../../slices/sequencerSlice";

const Cell = memo(({ relativeNoteIndex, stepIndex }) => {
  const dispatch = useDispatch();

  const activeOctave = useSelector(state => state.note.octave);

  const globalNoteIndex = (activeOctave - 1) * 12 + relativeNoteIndex;

  //  Подписка только на СВОЁ состояние (isActive)
  //  ищем ноту в массиве объектов по времени и имени
  const isActive = useSelector(state => {
    // Если у тебя в grid[нота][шаг] лежит 0 или 1, то это еще быстрее:
    return state.sequencer.grid[globalNoteIndex][stepIndex] === 1;
  });

  // Подписка только на "свой" шаг (Highlight)
  // Ячейка "проснется" только когда currentStep станет равен её stepIndex
  const isCurrent = useSelector(
    state => state.sequencer.currentStep === stepIndex,
  );

  const handleToggle = () => {
    dispatch(toggleStep({ noteIndex: globalNoteIndex, stepIndex }));
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        width: "40px",
        height: "30px",
        backgroundColor: isCurrent ? "#444" : isActive ? "#00ffcc" : "#222",
        border: "1px solid #111",
        boxSizing: "border-box",
        cursor: "pointer",
        transition: "background-color 0.05s",
      }}
    />
  );
});

export default Cell;
