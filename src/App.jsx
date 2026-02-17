import { useEffect } from "react";
import { useSelector } from "react-redux";
import "./App.css";
import Keyboard from "./components/keyboard/Keyboard";
import playSound from "./utility/playSound";
// import StepSequencer from "./components/sequencer/SequencerSketch";
import Sequencer from "./components/sequencer/Sequencer";

function App() {
  const activeNote = useSelector(state => state.note.activeNote);

  useEffect(() => {
    playSound(activeNote);
  }, [activeNote]);

  return (
    <>
      <Sequencer />
      <Keyboard></Keyboard>
    </>
  );
}

export default App;
