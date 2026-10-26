import { triggerDrumVisualLevel } from '../core/audioEngineCore';
import { compensateLatency } from '../../utils/audioMathUtils';

const isSynthInvalid = (synth) => !synth || !synth.instrument;
const isDrumMissing = (engine, instrumentName) =>
  !engine || !engine[instrumentName] || !engine[instrumentName].instrument;
const isVisualTriggerActive = (drumIndex) => typeof drumIndex === 'number';

export const playSynthNote = (synth, time, noteData) => {
  if (isSynthInvalid(synth)) return;

  synth.instrument.triggerAttackRelease(noteData.note, noteData.duration, time);
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
  if (isDrumMissing(engine, instrumentName)) return;

  const { instrument } = engine[instrumentName];
  const playTime = compensateLatency(time);

  playDrumHit(instrument, release, playTime);

  if (isVisualTriggerActive(noteData.drumIndex)) {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
};
