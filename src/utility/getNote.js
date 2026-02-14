// import { useSelector } from "react-redux";

// import { store } from "../slices/store";

const getNote = (keyboardLetter, startOctave, noteMap, octaveMap) => {
  // const noteMap = store.getState().note.noteMap;
  // const octaveMap = store.getState().note.noteOctaveIndexMap;
  console.log(
    // keyboardLetter,
    // startOctave,
    noteMap,
    octaveMap,
    "noteMap, octaveMap",
  );

  const note = noteMap[keyboardLetter[0]];
  const octave = octaveMap[keyboardLetter[0]] + startOctave;

  return `${note}${octave}`;
};

export default getNote;
