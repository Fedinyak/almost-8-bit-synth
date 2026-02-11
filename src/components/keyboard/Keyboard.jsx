import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
// import { decrement, increment } from "../../slices/counterSlice";
import { setActiveNote } from "../../slices/noteSlice.js";
// import playSound from "../../utility/playSound";
import getNote from "../../utility/getNote";
import KeyboardKey from "./KeyboardKey";

const Keyboard = () => {
  // const count = useSelector(state => state.counter.value);
  const keyboardLetter = useSelector(state => state.note.keyboardLetter);
  const octave = useSelector(state => state.note.octave);
  const activeNote = useSelector(state => state.note.activeNote);

  const dispatch = useDispatch();

  const handleKeyboardKeyDown = event => {
    if (keyboardLetter.join().includes(event.key)) {
      console.log(event.key, octave, "event.key, octave");
      const note = getNote(event.key, octave);
      dispatch(setActiveNote(note));
    }
  };

  useEffect(() => {
    // Add the event listener when the component mounts
    document.addEventListener("keydown", handleKeyboardKeyDown);

    // Provide a cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyboardKeyDown);
    };
  }, []); // Empty dependency array ensures it runs once on mount and once on unmount

  // useEffect(() => {
  //   playSound(activeNote);
  // }, [activeNote]);

  return (
    <div className="keyboard">
      {/* <div>
        <button
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
        >
          Increment
        </button>
        <span>{count}</span>
        <button
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
        >
          Decrement
        </button>
      </div> */}
      {keyboardLetter.map(letter => KeyboardKey(letter, octave, activeNote))}
    </div>
  );
};

export default Keyboard;
