import { transport } from './transport';
import { draw } from './draw';
import { schedulerRegistry } from './schedulerRegistry';
import { schedulerTimer } from './schedulerTimer';
import { schedulerPlayhead } from './schedulerPlayhead';
import { executeSchedulerTick, syncNextStepAudioTime } from './schedulerCore';
import { getStepsPerPattern } from '../../utils/audioMathUtils';

const SCHEDULER_INTERVAL_MS = 25;

export const resetHardwareCounters = (startingPattern = 0) => {
  const secondsPerMeasure = transport.getSecondsPerMeasure();
  const secondsPerStep = secondsPerMeasure / getStepsPerPattern();

  syncNextStepAudioTime(secondsPerStep);
  schedulerPlayhead.reset(startingPattern);
};

export const updateHardwarePatternBounds = (count) => {
  schedulerPlayhead.setMaxPatterns(count);
};

export const updateHardwareLoopState = (
  isLooping,
  selectedPatternIndex,
  currentPlayPatternIndex,
  pendingPatternIndex,
) => {
  schedulerPlayhead.setLoopState(
    isLooping,
    selectedPatternIndex,
    pendingPatternIndex,
  );
};

export const getHardwareLoopState = () => {
  const { isLooping, pendingJumpIndex } = schedulerPlayhead.getConfig();
  return { isLooping, loopPatternIndex: pendingJumpIndex };
};

export const scheduler = {
  getActiveTracks() {
    return schedulerRegistry.getActiveTracks();
  },
  registerTrack(track) {
    schedulerRegistry.registerTrack(track);
  },
  unregisterTrack(track) {
    schedulerRegistry.unregisterTrack(track);
  },

  registerDrawingLoop(id, callback, intervalInSeconds) {
    schedulerRegistry.registerDrawingLoop(id, callback, intervalInSeconds);
  },
  unregisterDrawingLoop(id) {
    schedulerRegistry.unregisterDrawingLoop(id);
  },

  resetDrawingTimeline() {
    draw.clear();
    resetHardwareCounters();
  },

  startLoop(startingPattern = 0) {
    if (schedulerTimer.isRunning()) return;

    resetHardwareCounters(startingPattern);
    schedulerTimer.start(executeSchedulerTick, SCHEDULER_INTERVAL_MS);
  },

  stopLoop() {
    if (!schedulerTimer.isRunning()) return;
    schedulerTimer.stop();
    draw.clear();
    resetHardwareCounters();
  },

  updateState(state, startingPattern = 0) {
    if (state === 'start') {
      scheduler.startLoop(startingPattern);
    } else {
      scheduler.stopLoop();
    }
  },

  jumpToTimeline() {
    scheduler.resetDrawingTimeline();
  },
};
