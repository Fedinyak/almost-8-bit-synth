import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { setEngineBpm, setPlayState } from '../utility/audioEngineCore';

export const useAudioPlaybackControl = () => {
  const bpm = useSelector((state) => state.sequencer.bpm);

  const sequencerPlayState = useSelector(
    (state) => state.sequencer.sequencerPlayState,
  );

  useEffect(() => {
    setPlayState(sequencerPlayState);
  }, [sequencerPlayState]);

  useEffect(() => {
    setEngineBpm(bpm);
  }, [bpm]);
};
