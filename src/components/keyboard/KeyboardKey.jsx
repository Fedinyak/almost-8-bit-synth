import cn from "classnames";
import { useDispatch } from "react-redux";
import { setActiveNote } from "../../slices/noteSlice";
import getNote from "../../utility/getNote";

const KeyboardKey = (keyboardLetter, octave, activeNote) => {
  const dispatch = useDispatch();
  // const activeNote = useSelector(state => state.note.activeNote);
  const note = getNote(keyboardLetter, octave);

  const isKeyAccidental = (keyboardLetter, octave) => {
    return getNote(keyboardLetter, octave).includes("#");
  };

  const isNoteActive = (letterNote, activeNote) => {
    // console.log(letterNote, activeNote, "letterNote, activeNote");
    if (letterNote === activeNote) {
      return true;
    }
    return false;
  };

  const keyboardStyle = cn("keyboardKey", {
    pianoWhiteKey: !isKeyAccidental(keyboardLetter, octave),
    pianoBlackKey: isKeyAccidental(keyboardLetter, octave),
    keyboardActiveKey: isNoteActive(note, activeNote),
  });

  return (
    <button
      className={keyboardStyle}
      onClick={() => {
        dispatch(setActiveNote(note));
      }}
      key={keyboardLetter}
    >
      {keyboardLetter}
      <br />
      {note}
    </button>
  );
};

export default KeyboardKey;
