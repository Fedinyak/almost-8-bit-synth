import { useDispatch } from "react-redux";
import { setSequencerNote } from "../../slices/sequencerSlice";
import cn from "classnames";

// eslint-disable-next-line no-unused-vars
const Cell = ({ note, sequencerActiveNot, step }) => {
  const dispatch = useDispatch();

  const isSelectedNote = sequencerActiveNot.note === note;

  const handleNote = () => {
    if (isSelectedNote) {
      return dispatch(setSequencerNote({ note: null, step }));
    }
    dispatch(setSequencerNote({ note, step }));
  };

  const isKeyAccidental = note.includes("#");

  const cellStyle = cn("sequencer-cell", {
    "sequencer-cell-accidental": isKeyAccidental,
    "sequencer-cell-active": isSelectedNote,
  });

  return (
    <button className={cellStyle} onClick={handleNote}>
      {note}
      <br />
    </button>
  );
};

export default Cell;
