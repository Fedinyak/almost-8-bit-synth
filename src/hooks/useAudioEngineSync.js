import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  DEFAULT_DRUM_RELEASE,
  SYNTH_LIST,
  DRUM_KIT_LIST,
} from '../constants/constants';
import noteAndKeyMap from '../constants/noteAndKeyMap';
import {
  initializeDrums,
  initializeSynths,
  stopAllAudio,
} from '../utility/audioLifecycleActions';
import {
  setupDrumsPlayback,
  setupSynthPlayback,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from '../utility/audioPlaybackActions';
import {
  initializeAudioRouting,
  applySynthEnvelope,
  applyDynamicBypass,
} from '../utility/audioModulationActions';
import { synthEnginesRegistry } from '../utility/visualizerState';

const drumNoteMap = noteAndKeyMap.drumNoteMap;

export const useAudioEngineSync = (
  synthEnginesRef,
  synthPartRef,
  drumsEngineRef,
  drumsPartRef,
) => {
  const synthData = useSelector((state) => state.patterns.synthData);
  const drumsList = useSelector((state) => state.patterns.drumsData);
  const soundSettings = useSelector(
    (state) => state.soundSettings?.synths || {},
  );

  const synthAnalysersRef = useRef({});
  const synthChannelsRef = useRef({});

  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);

    synthEnginesRegistry.current = synthEnginesRef.current;

    initializeAudioRouting(
      SYNTH_LIST,
      synthEnginesRef,
      synthChannelsRef,
      synthAnalysersRef,
    );
  }, [drumsEngineRef, synthEnginesRef]);

  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      const synthInstance = synthEnginesRef.current[name];
      const settings = soundSettings[name];

      if (!synthInstance || !settings) return;

      applySynthEnvelope(synthInstance, settings);
      applyDynamicBypass(name, synthInstance, settings);
    });

    DRUM_KIT_LIST.forEach((name) => {
      const drumInstance = drumsEngineRef.current?.[name];
      const settings = soundSettings[name];

      if (!drumInstance || !settings) return;

      applySynthEnvelope(drumInstance, settings);
      applyDynamicBypass(name, drumInstance, settings);
    });
  }, [soundSettings, synthEnginesRef, drumsEngineRef]);

  useEffect(() => {
    SYNTH_LIST.forEach((name) => {
      setupSynthPlayback(name, synthEnginesRef.current, synthPartRef.current);
    });

    setupDrumsPlayback(
      drumsEngineRef,
      drumsPartRef,
      drumNoteMap,
      DEFAULT_DRUM_RELEASE,
    );

    return () => {
      stopAllAudio({
        synths: synthEnginesRef,
        parts: synthPartRef,
        drumsEngine: drumsEngineRef,
        drumsPart: drumsPartRef,
        synthAnalysersRef,
        synthChannelsRef,
      });
    };
  }, [drumsEngineRef, drumsPartRef, synthEnginesRef, synthPartRef]);

  useEffect(() => {
    SYNTH_LIST.forEach((synthName) => {
      syncInstrumentPatternsToTrack(
        synthPartRef.current[synthName],
        synthData[synthName],
      );
    });

    syncDrumPatternsToTrack(drumsPartRef.current, drumsList, drumNoteMap);
  }, [synthData, drumsList, drumsPartRef, synthPartRef]);
};
