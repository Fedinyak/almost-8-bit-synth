import { useDispatch, useSelector } from 'react-redux';
import {
  setBpm,
  // setIsLooping,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setSequencerPlayState,
} from '../../../slices/playerSlice';
import BpmVisualizer from './BpmVisualizer';

const SequencerControlPanel = () => {
  const dispatch = useDispatch();
  const isLooping = useSelector((state) => state.player.isLooping);

  return (
    <div>
      <button onClick={() => dispatch(setSequencerPlayState('start'))}>
        start
      </button>
      <button onClick={() => dispatch(setSequencerPlayState('stop'))}>
        stop
      </button>
      <button onClick={() => dispatch(setSequencerPlayState('pause'))}>
        pause
      </button>
      {
        <>
          <button onClick={() => dispatch(setIsLoopingFalse())}>
            Loop false {isLooping ? 'true' : 'false'}
          </button>
          <button onClick={() => dispatch(setIsLoopingTrue())}>
            Loop true {isLooping ? 'true' : 'false'}
          </button>
        </>
      }
      <button onClick={() => dispatch(setBpm(100))}>100</button>
      <button onClick={() => dispatch(setBpm(200))}>200</button>
      {/* <BpmVisualizer /> */}
    </div>
  );
};

export default SequencerControlPanel;
