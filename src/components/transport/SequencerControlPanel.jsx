import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setBpm,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setSequencerPlayState,
} from '../../store/playerSlice';
import { getNativeContext } from '../../audio/core/nativeContext';
// Импортируем Tone для его безопасной разблокировки по жесту пользователя
import * as Tone from 'tone';

const SequencerControlPanel = () => {
  const dispatch = useDispatch();
  const playbackStatus = useSelector((state) => state.player.playbackStatus);

  // Вычисляем состояние кнопки Loop на основе статуса конечного автомата
  const isLoopingActiveInMachine =
    playbackStatus === 'LOOPING_ACTIVE' || playbackStatus === 'LOOP_CHANGING';

  const handleStart = async () => {
    // 1. Разблокируем нативный контекст Web Audio API
    const audioContext = getNativeContext();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch((err) => {
        console.error('Failed to resume Native AudioContext:', err);
      });
    }

    // 2. Разблокируем контекст Tone.js, чтобы он не ругался в консоли
    if (Tone && typeof Tone.start === 'function') {
      await Tone.start();
    }

    dispatch(setSequencerPlayState('start'));
  };

  return (
    <div>
      <button onClick={handleStart}>start</button>
      <button onClick={() => dispatch(setSequencerPlayState('stop'))}>
        stop
      </button>
      <button onClick={() => dispatch(setSequencerPlayState('pause'))}>
        pause
      </button>

      {/* СТРОГОЕ ДЕКЛАРАТИВНОЕ РАЗДЕЛЕНИЕ КНОПОК НА ОСНОВЕ СТАТУСА FSM */}
      {!isLoopingActiveInMachine ? (
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
