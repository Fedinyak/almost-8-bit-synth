import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { setEngineBpm, setPlayState } from '../utility/audioEngineCore';

export const useAudioPlaybackControl = () => {
  const bpm = useSelector((state) => state.player.bpm);

  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );

  useEffect(() => {
    setPlayState(sequencerPlayState);
  }, [sequencerPlayState]);

  useEffect(() => {
    setEngineBpm(bpm);
  }, [bpm]);
};
