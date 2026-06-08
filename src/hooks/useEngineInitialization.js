import { useRef } from 'react';
import { useAudioEngineSync } from './useAudioEngineSync';
import { useAudioPlaybackControl } from './useAudioPlaybackControl';
import { useSequencerScheduler } from './useSequencerScheduler';

export const useEngineInitialization = () => {
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
