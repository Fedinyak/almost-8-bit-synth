export const SEQUENCER_CONFIG = {
  NOTES_COUNT: 72,
  TOTAL_STEPS: 256,
  SEQUENCER_STEP: 16,
  PATTERN_MAX_COUNT: 16,

  DEFAULT_BPM: 120,
  DEFAULT_PATTERN_COUNT: 3,
  VISIBLE_NOTES_COUNT: 24,

  MIN_PATTERN_COUNT: 1,
  TRACK_START_POSITION: 0,
  INITIAL_PATTERN_INDEX: 0,
};

export const EMPTY_SYNTH_PATTERN_TEMPLATE = [
  { time: '0:0:0', note: null },
  { time: '0:0:1', note: null },
  { time: '0:0:2', note: null },
  { time: '0:0:3', note: null },
  { time: '0:1:0', note: null },
  { time: '0:1:1', note: null },
  { time: '0:1:2', note: null },
  { time: '0:1:3', note: null },
  { time: '0:2:0', note: null },
  { time: '0:2:1', note: null },
  { time: '0:2:2', note: null },
  { time: '0:2:3', note: null },
  { time: '0:3:0', note: null },
  { time: '0:3:1', note: null },
  { time: '0:3:2', note: null },
  { time: '0:3:3', note: null },
];

export const EMPTY_DRUM_TRACK_TEMPLATE = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
