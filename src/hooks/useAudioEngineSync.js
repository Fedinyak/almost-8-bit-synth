import noteAndKeyMap from '../constants/noteAndKeyMap';
import { DEFAULT_DRUM_RELEASE, SYNTH_LIST } from '../constants/constants';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import {
  initializeDrums,
  initializeSynths,
  setupDrumsPlayback,
  setupSynthPlayback,
  stopAllAudio,
  syncDrumPatternsToTrack,
  syncInstrumentPatternsToTrack,
} from '../utility/audioEngineActions';

const drumNoteMap = noteAndKeyMap.drumNoteMap;

export const useAudioEngineSync = (
  synthEnginesRef,
  synthPartRef,
  drumsEngineRef,
  drumsPartRef,
) => {
  const synthData = useSelector((state) => state.sequencer.synthData);
  const drumsList = useSelector((state) => state.sequencer.drumsData);

  useEffect(() => {
    initializeSynths(SYNTH_LIST, synthEnginesRef.current);
    initializeDrums(drumsEngineRef);
  }, [drumsEngineRef, synthEnginesRef]);

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

    return () =>
      stopAllAudio({
        synths: synthEnginesRef,
        parts: synthPartRef,
        drumsEngine: drumsEngineRef,
        drumsPart: drumsPartRef,
      });
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
