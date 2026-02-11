import { useEffect } from "react";
import { useSelector } from "react-redux";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "/vite.svg";
import "./App.css";
import Keyboard from "./components/keyboard/Keyboard";
import playSound from "./utility/playSound";
import StepSequencer from "./components/sequencer/SequencerSketch";
import Sequencer from "./components/sequencer/Sequencer";

function App() {
  // const [count, setCount] = useState(0);
  const activeNote = useSelector(state => state.note.activeNote);

  useEffect(() => {
    playSound(activeNote);
  }, [activeNote]);

  return (
    <>
      <div>SYNTH</div>
      {/* <StepSequencer /> */}
      <br />
      <br />
      <br />
      <br />
      <Sequencer />
      <Keyboard></Keyboard>

      {/* <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p> */}
    </>
  );
}

export default App;
