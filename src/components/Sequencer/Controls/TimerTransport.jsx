import { useRef } from 'react';
import { useAudioEngineSync } from '../../../hooks/useAudioEngineSync';
import { useAudioPlaybackControl } from '../../../hooks/useAudioPlaybackControl';
import { useSequencerScheduler } from '../../../hooks/useSequencerScheduler';

const TimerTransport = () => {
  const synthEnginesRef = useRef({});
  const synthPartRef = useRef({});
  const drumsEngineRef = useRef(null);
  const drumsPartRef = useRef(null);

  useAudioEngineSync(
    synthEnginesRef,
    synthPartRef,
    drumsEngineRef,
    drumsPartRef,
  );

  useAudioPlaybackControl();

  useSequencerScheduler();

  return null;
};

export default TimerTransport;
