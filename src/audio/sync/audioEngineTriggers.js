import { triggerDrumVisualLevel } from '../core/audioEngineCore';
import { compensateLatency } from '../../utils/audioMathUtils';

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

export const processDrumPlaybackHit = (
  time,
  noteData,
  engine,
  drumNoteMap,
  release,
) => {
  const instrumentName = drumNoteMap[noteData.note];

  const drumContainer = engine[instrumentName];
  if (!drumContainer || !drumContainer.instrument) return;

  const playTime = compensateLatency(time);

  playDrumHit(drumContainer.instrument, release, playTime);

  if (typeof noteData.drumIndex === 'number') {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
};

export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (!synthInstance?.output) return;

  if (typeof synthInstance.output.disconnect === 'function') {
    try {
      synthInstance.output.disconnect();
    } catch (e) {}
  }

  synthInstance.output.connect(channel);
  channel.connect(analyser);
  channel.toDestination();
};
