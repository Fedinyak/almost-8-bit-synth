import cn from "classnames";
import { useDispatch } from "react-redux";
import { setActiveNote } from "../../slices/noteSlice";
import getNote from "../../utility/getNote";
import noteAndKeyMap from "../../constants.js/noteAndKeyMap";

const KeyboardKey = ({ keyboardLetter, octave, activeNote }) => {
  const dispatch = useDispatch();

  // const noteMap = useSelector(state => state.note.noteMap);
  // const octaveMap = useSelector(state => state.note.noteOctaveIndexMap);
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;
  // const activeNote = useSelector(state => state.note.activeNote);
  const note = getNote(keyboardLetter, octave, noteMap, octaveMap);

  const isKeyAccidental = (keyboardLetter, octave) => {
    return getNote(keyboardLetter, octave, noteMap, octaveMap).includes("#");
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
      <span>{keyboardLetter}</span>
      <br />
      {note}
    </button>
  );
};

export default KeyboardKey;
