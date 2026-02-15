const getNote = (keyboardLetter, startOctave, noteMap, octaveMap) => {
  const note = noteMap[keyboardLetter[0]];
  const octave = octaveMap[keyboardLetter[0]] + startOctave;

  return `${note}${octave}`;
};

export default getNote;
