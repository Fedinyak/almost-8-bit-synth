import { useDispatch } from "react-redux";
import {
  setSequencerInstrumentNote,
  // setSequencerNote,
} from "../../slices/sequencerSlice";
import cn from "classnames";

// eslint-disable-next-line no-unused-vars
const DrumCell = ({ instrument, note, sequencerActiveNote, step }) => {
  const dispatch = useDispatch();

  const isSelectedNote = sequencerActiveNote.note === note;

  const handleNote = () => {
    if (isSelectedNote) {
      // return dispatch(setSequencerNote({ note: null, step }));
      return dispatch(
        setSequencerInstrumentNote({ instrument, note: null, step }),
      );
    }
    // dispatch(setSequencerNote({ note, step, }));
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

export default DrumCell;
