import { useDispatch, useSelector } from "react-redux";
import {
  setBpm,
  setIsLooping,
  setSequencerPlayState,
} from "../../slices/sequencerSlice";
import BpmVisualizer from "./BpmVisualizer";

const SequencerControlPanel = () => {
  const dispatch = useDispatch();
  const isLooping = useSelector(state => state.sequencer.isLooping);

  return (
    <div>
      <button onClick={() => dispatch(setSequencerPlayState("start"))}>
        start
      </button>
      <button onClick={() => dispatch(setSequencerPlayState("stop"))}>
        stop
      </button>
      <button onClick={() => dispatch(setSequencerPlayState("pause"))}>
        pause
      </button>
      <button onClick={() => dispatch(setIsLooping())}>
        Loop {isLooping ? "true" : "false"}
      </button>
      <button onClick={() => dispatch(setBpm(100))}>100</button>
      <button onClick={() => dispatch(setBpm(200))}>200</button>
      <BpmVisualizer />
    </div>
  );
};

export default SequencerControlPanel;
