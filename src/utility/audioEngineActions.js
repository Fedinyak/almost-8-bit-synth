import createSynth from './synthEngine';
import createDrums from './drumEngine';
import * as Tone from 'tone';
import {
  clearTrackNotes,
  createPlaybackTrack,
  setTrackLoopDuration,
  writeNoteToTrack,
  triggerDrumVisualLevel,
} from './audioEngineCore';
import {
  calculateAbsoluteTime,
  compensateLatency,
  microTimingOffset,
  checkBypassCondition, // Импортируем чистую утилиту проверки байпаса
} from './audioMathUtils';
import {
  resetDrumLevels,
  resetSynthAnalysers,
  synthAnalysers,
} from './visualizerState';
import { SYNTH_PARAMS } from '../constants/synthParamsConfig';

// ФУНКЦИИ КОММУТАЦИИ ДЛЯ ХУКА
export const createAudioChannel = () => new Tone.Volume();

export const createAudioAnalyser = () =>
  new Tone.Analyser({ type: 'waveform', size: 32 });

export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (!synthInstance?.output) return;

  synthInstance.output.disconnect();
  synthInstance.output.connect(channel);

  channel.connect(analyser);
  channel.toDestination();
};

// ВЫНЕСЕННАЯ ЛОГИКА: Маршрутизация каналов и анализаторов для списка инструментов
export const initializeAudioRouting = (
  synthList,
  enginesRef,
  channelsRef,
  analysersRef,
) => {
  synthList.forEach((name) => {
    const synthInstance = enginesRef.current[name];
    if (!synthInstance || analysersRef.current[name]) return;

    const channel = createAudioChannel();
    const analyser = createAudioAnalyser();

    connectSynthToMixer(synthInstance, channel, analyser);

    channelsRef.current[name] = channel;
    analysersRef.current[name] = analyser;
    synthAnalysers[name] = analyser;
  });
};

// ВЫНЕСЕННАЯ ЛОГИКА: Безопасное применение ADSR/Атаки к инструменту
export const applySynthEnvelope = (synthInstance, attack) => {
  if (!synthInstance.instrument || typeof attack !== 'number') return;

  synthInstance.instrument.set({
    envelope: { attack },
  });
};

// ВЫНЕСЕННАЯ ЛОГИКА: Мгновенное изменение wet-микса эффекта в Tone.js
export const updateEffectMix = (fxNode, value) => {
  fxNode.set({ wet: value });
};

// ВЫНЕСЕННАЯ ЛОГИКА: Переключение режима активности узла и вывод красивых логов
export const toggleNodeBypass = (fxNode, shouldBypass, label, synthName) => {
  if (shouldBypass && !fxNode.bypassed) {
    console.log(
      `[⚡ BYPASS ON]: Эффект "${label}" для ${synthName} усыплен. ЦП отдыхает.`,
    );
  } else if (!shouldBypass && fxNode.bypassed) {
    console.log(
      `[🔊 BYPASS OFF]: Эффект "${label}" для ${synthName} проснулся.`,
    );
  }

  fxNode.bypassed = shouldBypass;
};

// ВЫНЕСЕННАЯ ЛОГИКА: Декларативный обход паспорта параметров и управление байпасом эффектов
export const applyDynamicBypass = (synthName, synthInstance, settings) => {
  Object.entries(SYNTH_PARAMS).forEach(([paramName, paramConfig]) => {
    if (!paramConfig.isEffect || !paramConfig.nodeKey) return;

    const fxNode = synthInstance[paramConfig.nodeKey];
    const liveValue = settings[paramName];
    if (!fxNode || typeof liveValue !== 'number') return;

    updateEffectMix(fxNode, liveValue);

    const shouldBypass = checkBypassCondition(
      liveValue,
      paramConfig.bypassValue,
    );

    toggleNodeBypass(fxNode, shouldBypass, paramConfig.label, synthName);
  });
};

export const cleanupAudioResources = ({
  synths,
  parts,
  drumEngine,
  drumPart,
  analysersRef,
  channelsRef,
}) => {
  if (synths) {
    Object.values(synths).forEach((synthContainer) => {
      if (synthContainer && typeof synthContainer.dispose === 'function') {
        synthContainer.dispose();
      }
    });
  }

  const disposeRes = (res) =>
    res && !res.disposed && typeof res.dispose === 'function' && res.dispose();

  if (analysersRef?.current)
    Object.values(analysersRef.current).forEach(disposeRes);
  if (channelsRef?.current)
    Object.values(channelsRef.current).forEach(disposeRes);

  if (analysersRef) analysersRef.current = {};
  if (channelsRef) channelsRef.current = {};
  resetSynthAnalysers();

  const audioResources = [
    ...Object.values(parts || {}),
    ...Object.values(drumEngine || {}),
    drumPart,
  ];

  audioResources.filter(Boolean).forEach(disposeRes);
};

export const initializeSynths = (synthList, enginesRef) => {
  synthList.forEach((synthName) => {
    if (!enginesRef[synthName]) {
      enginesRef[synthName] = createSynth();
    }
  });
};

export const initializeDrums = (drumsRef) => {
  if (!drumsRef.current) {
    drumsRef.current = createDrums();
  }
};

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  tracksRef[synthName] = createPlaybackTrack((time, noteData) => {
    const engine = enginesRef[synthName];
    if (engine) playSynthNote(engine, time, noteData);
  });
};

export const setupDrumsPlayback = (
  drumsEngineRef,
  drumsTrackRef,
  drumNoteMap,
  release,
) => {
  if (drumsTrackRef.current) return;

  drumsTrackRef.current = createPlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (!engine) return;

    const instrumentName = drumNoteMap[noteData.note];
    const instrument = engine[instrumentName];

    if (instrument) {
      const playTime = compensateLatency(time);
      playDrumHit(instrument, release, playTime);

      if (typeof noteData.drumIndex === 'number') {
        triggerDrumVisualLevel(noteData.drumIndex, playTime);
      }
    }
  });
};

export const playSynthNote = (synth, time, noteData) => {
  if (synth && synth.instrument) {
    synth.instrument.triggerAttackRelease(
      noteData.note,
      noteData.duration,
      time,
    );
  }
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};

export const syncInstrumentPatternsToTrack = (track, instrumentData) => {
  if (!track || !instrumentData?.patterns) return;

  clearTrackNotes(track);

  instrumentData.patterns.forEach((patternGrid, measureIndex) => {
    patternGrid
      .filter((item) => item.note)
      .forEach((item) => {
        const startTime = calculateAbsoluteTime(item.time, measureIndex);
        writeNoteToTrack(track, startTime, item);
      });
  });

  setTrackLoopDuration(track, instrumentData.patterns.length);
};

export const syncDrumPatternsToTrack = (track, drumsData, drumNoteMap) => {
  if (!track || !drumsData?.patterns) return;
  clearTrackNotes(track);

  drumsData.patterns.forEach((drumsInMeasure, measureIndex) => {
    Object.entries(drumsInMeasure).forEach(
      ([drumName, trackSteps], drumIndex) => {
        if (!Array.isArray(trackSteps)) return;

        const note = drumNoteMap[drumName];
        if (!note) return;

        trackSteps.forEach((isHit, stepIndex) => {
          if (isHit === 1) {
            const stepTime = `0:0:${stepIndex}`;
            const startTime =
              calculateAbsoluteTime(stepTime, measureIndex) +
              microTimingOffset(drumIndex);

            writeNoteToTrack(track, startTime, { note, drumIndex });
          }
        });
      },
    );
  });

  setTrackLoopDuration(track, drumsData.patterns.length);
};

export const stopAllAudio = (refs) => {
  cleanupAudioResources({
    synths: refs.synths.current,
    parts: refs.parts.current,
    drumEngine: refs.drumsEngine.current,
    drumPart: refs.drumsPart.current,
    analysersRef: refs.synthAnalysersRef,
    channelsRef: refs.synthChannelsRef,
  });

  refs.synths.current = {};
  refs.parts.current = {};
  refs.drumsEngine.current = null;
  refs.drumsPart.current = null;

  resetDrumLevels();
};
