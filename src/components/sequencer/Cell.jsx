import { useDispatch } from "react-redux";
import { setSequencerInstrumentNote } from "../../slices/sequencerSlice";
import cn from "classnames";

const Cell = ({ instrument, note, sequencerActiveNote, step }) => {
  const dispatch = useDispatch();

  const isSelectedNote = sequencerActiveNote.note === note;

  const handleNote = () => {
    if (isSelectedNote) {
      return dispatch(
        setSequencerInstrumentNote({ instrument, note: null, step }),
      );
    }
    dispatch(setSequencerInstrumentNote({ instrument, note, step }));
  };

  const isKeyAccidental = note.includes("#");

  const cellStyle = cn("sequencer-cell", {
    "sequencer-cell-accidental": isKeyAccidental,
    "sequencer-cell-active": isSelectedNote,
  });

  return (
    <button className={cellStyle} onClick={handleNote}>
      {/* {note} */}
      <br />
    </button>
  );
};

export default Cell;
