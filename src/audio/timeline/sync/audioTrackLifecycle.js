import { PlaybackTrack } from '../../../audio/timeline/playbackTrack';
import { scheduler } from '../../../audio/timeline/scheduler';
import {
  playSynthNote,
  processDrumPlaybackHit,
} from '../../bridge/audioEngineTriggers';

const bindTrackLifecycleToScheduler = (track) => {
  scheduler.registerTrack(track);

  const originalDispose = track.dispose;
  track.dispose = () => {
    scheduler.unregisterTrack(track);
    originalDispose();
  };
};

export const setupSynthPlayback = (synthName, enginesRef, tracksRef) => {
  if (tracksRef[synthName]) return;

  const track = PlaybackTrack((time, noteData) => {
    const engine = enginesRef[synthName];
    if (engine) {
      playSynthNote(engine, time, noteData);
    }
  });

  bindTrackLifecycleToScheduler(track);
  tracksRef[synthName] = track;
};

export const setupDrumsPlayback = (
  drumsEngineRef,
  drumsTrackRef,
  drumNoteMap,
  release,
) => {
  if (drumsTrackRef.current) return;

  const track = PlaybackTrack((time, noteData) => {
    const engine = drumsEngineRef.current;
    if (engine) {
      processDrumPlaybackHit(time, noteData, engine, drumNoteMap, release);
    }
  });

  bindTrackLifecycleToScheduler(track);
  drumsTrackRef.current = track;
};
