import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setBpm,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setSequencerPlayState,
} from '../../store/playerSlice';
import { getNativeContext } from '../../audio/core/nativeContext';
import { scheduler } from '../../audio/core/scheduler'; // Импортируем шедулер для передачи стартовой точки
// import * as Tone from 'tone';

const SequencerControlPanel = () => {
  const dispatch = useDispatch();
  const playbackStatus = useSelector((state) => state.player.playbackStatus);
  // Вытаскиваем текущий музыкальный индекс из стора, чтобы запустить движок строго с него
  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );
  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );

  const isLoopingActiveInMachine =
    playbackStatus === 'LOOPING_ACTIVE' || playbackStatus === 'LOOP_CHANGING';

  const handleStart = async () => {
    const audioContext = getNativeContext();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch((err) => {
        console.error('Failed to resume Native AudioContext:', err);
      });
    }

    // if (Tone && typeof Tone.start === 'function') {
    //   await Tone.start();
    // }

    // ИСПРАВЛЕНО: Перед диспатчем стейта явно синхронизируем железный счетчик
    // планировщика со звуковым индексом из стора, если прибор запускается из режима Stop
    if (sequencerPlayState === 'stop') {
      scheduler.updateState('start', currentPlayPatternIndex);
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
    </div>
  );
};

export default SequencerControlPanel;
