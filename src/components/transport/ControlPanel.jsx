import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setBpm,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setSequencerPlayState,
} from '../../store/playerSlice';

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

      {/* СТРОГОЕ ДЕКЛАРАТИВНОЕ РАЗДЕЛЕНИЕ КНОПОК НА ОСНОВЕ REDUX СТЕЙТА */}
      {!isLooping ? (
        <button onClick={() => dispatch(setIsLoopingTrue())}>
          Start Loop (status: false)
        </button>
      ) : (
        <button onClick={() => dispatch(setIsLoopingFalse())}>
          Stop Loop (status: true)
        </button>
      )}

      <button onClick={() => dispatch(setBpm(100))}>100</button>
      <button onClick={() => dispatch(setBpm(200))}>200</button>
      {/* <BpmVisualizer /> */}
    </div>
  );
};

export default SequencerControlPanel;
