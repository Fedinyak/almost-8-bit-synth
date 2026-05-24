import * as Tone from 'tone';

export const microTimingOffset = (drumIndex) => {
  const DRUM_PHASE_OFFSET = 0.001;
  return drumIndex * DRUM_PHASE_OFFSET;
};

export const calculateAbsoluteTime = (time, measureIndex) => {
  return (
    Tone.Time(time).toSeconds() + Tone.Time(`${measureIndex}m`).toSeconds()
  );
};

export const compensateLatency = (plannedTime) => {
  const SCHEDULING_LOOKAHEAD_SEC = 0.01;
  return Math.max(plannedTime, Tone.now() + SCHEDULING_LOOKAHEAD_SEC);
};

export const getTotalSteps = (patterns, stepsPerMeasure = 16) => {
  const patternsCount = patterns?.length || 1;
  return patternsCount * stepsPerMeasure;
};

// ИСПРАВЛЕНО: Убрана деструктивная зависимость от общего количества шагов трека
export const calculateCurrentStep = (time) => {
  const STEPS_PER_BEAT = 4;
  const ticksPerStep = Tone.Transport.PPQ / STEPS_PER_BEAT;
  const currentTick = Tone.Transport.getTicksAtTime(time);

  return Math.floor(currentTick / ticksPerStep);
};

export const calculateCurrentPlayPattern = (step, stepsInMeasure) => {
  return Math.floor(step / stepsInMeasure);
};
