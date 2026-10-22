import { transport } from './transport';
import { getNativeContext } from './nativeContext';
import { draw } from './draw';
import { schedulerRegistry } from './schedulerRegistry';
import { schedulerPlayhead } from './schedulerPlayhead';
import { getStepsPerPattern } from '../../utils/audioMathUtils';

const LOOKAHEAD_WINDOW_SEC = 0.1;
let nextStepAudioTime = 0;

const isTimeWithinPlanningWindow = (time, scheduleUntilTime) =>
  time < scheduleUntilTime;
const calculateStepDuration = (secondsPerMeasure) =>
  secondsPerMeasure / getStepsPerPattern();

const dispatchAudioStepToTracks = (safeAudioTime, step, pattern) => {
  schedulerRegistry.getActiveTracks().forEach((track) => {
    if (typeof track.processAudioStep === 'function') {
      track.processAudioStep(safeAudioTime, step, pattern);
    }
  });
};

const dispatchVisualStepToInterface = (exactAudioTime, step, pattern) => {
  draw.schedule(exactAudioTime, () => {
    schedulerRegistry.getDrawingCallbacks().forEach((repeater) => {
      if (typeof repeater.callback === 'function') {
        repeater.callback(exactAudioTime, step, pattern);
      }
    });
  });
};

export const processHybridScheduling = (scheduleUntilAudioTime) => {
  const ctx = getNativeContext();
  if (!ctx) return;

  const secondsPerStep = calculateStepDuration(
    transport.getSecondsPerMeasure(),
  );

  if (nextStepAudioTime < ctx.currentTime) {
    nextStepAudioTime = ctx.currentTime + secondsPerStep;
  }

  while (
    isTimeWithinPlanningWindow(nextStepAudioTime, scheduleUntilAudioTime)
  ) {
    const exactAudioTime = nextStepAudioTime;
    const safeAudioTime = Math.max(exactAudioTime, ctx.currentTime);
    const { currentStep, currentPattern } = schedulerPlayhead.getCoordinates();

    dispatchAudioStepToTracks(safeAudioTime, currentStep, currentPattern);
    dispatchVisualStepToInterface(exactAudioTime, currentStep, currentPattern);

    schedulerPlayhead.advance();

    nextStepAudioTime += secondsPerStep;
  }
};

export const executeSchedulerTick = () => {
  if (!transport.isPlaying) return;
  const ctx = getNativeContext();
  if (!ctx) return;

  processHybridScheduling(ctx.currentTime + LOOKAHEAD_WINDOW_SEC);
};

export const syncNextStepAudioTime = (secondsPerStep) => {
  const ctx = getNativeContext();
  nextStepAudioTime = ctx ? ctx.currentTime + secondsPerStep : 0;
};
