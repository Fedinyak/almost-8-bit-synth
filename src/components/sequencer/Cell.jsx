import { useDispatch } from "react-redux";
import { setSequencerInstrumentNote } from "../../slices/sequencerSlice";
import cn from "classnames";

const Cell = ({
  instrument,
  note,
  sequencerActiveNote,
  step,
  patternIndex,
}) => {
  const dispatch = useDispatch();

  const isSelectedNote = sequencerActiveNote.note === note;
  // console.log(isSelectedNote, "isSelectedNote");

  const handleNote = () => {
    if (isSelectedNote) {
      return dispatch(
        setSequencerInstrumentNote({
          instrument,
          note: null,
          step,
          patternIndex,
        }),
      );
    }
    dispatch(
      setSequencerInstrumentNote({ instrument, note, step, patternIndex }),
    );
  };

  const isKeyAccidental = note.includes("#");

  const cellStyle = cn("sequencer-cell", {
    "sequencer-cell-accidental": isKeyAccidental,
    "sequencer-cell-active": isSelectedNote,
  });

  return (
    <button className={cellStyle} onClick={handleNote}>
      {/* {note} */}
      {/* <br /> */}
    </button>
  );
};

export default Cell;
