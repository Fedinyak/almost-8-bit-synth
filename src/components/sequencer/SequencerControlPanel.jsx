import { useDispatch } from "react-redux";
import { setBpm, setSequencerPlayState } from "../../slices/sequencerSlice";
import BpmVisualizer from "./BpmVisualizer";

const SequencerControlPanel = () => {
  const dispatch = useDispatch();

  return (
    <div>
      <button onClick={() => dispatch(setSequencerPlayState("start"))}>
        start
      </button>
      <button onClick={() => dispatch(setSequencerPlayState("stop"))}>
        stop
      </button>
      <button onClick={() => dispatch(setBpm(100))}>100</button>
      <button onClick={() => dispatch(setBpm(200))}>200</button>
      <BpmVisualizer />
    </div>
  );
};

export default SequencerControlPanel;
