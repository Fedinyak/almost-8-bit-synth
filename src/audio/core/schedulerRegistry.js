const activeTracks = new Set();
const drawingCallbacks = new Map();
const SIXTEENTH_NOTE_ID = '16n';

export const schedulerRegistry = {
  getActiveTracks() {
    return activeTracks;
  },
  registerTrack(track) {
    activeTracks.add(track);
  },
  unregisterTrack(track) {
    activeTracks.delete(track);
  },
  registerDrawingLoop(id, callback, intervalInSeconds) {
    drawingCallbacks.set(id, {
      callback,
      interval: intervalInSeconds,
      rate: SIXTEENTH_NOTE_ID,
    });
  },
  unregisterDrawingLoop(id) {
    drawingCallbacks.delete(id);
  },
  getDrawingCallbacks() {
    return drawingCallbacks;
  },
  clearAll() {
    activeTracks.clear();
    drawingCallbacks.clear();
  },
};
