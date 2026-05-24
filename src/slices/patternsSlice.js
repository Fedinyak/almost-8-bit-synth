import { createSlice } from '@reduxjs/toolkit';
import {
  SEQUENCER_CONFIG,
  EMPTY_SYNTH_PATTERN_TEMPLATE,
  EMPTY_DRUM_TRACK_TEMPLATE,
} from '../constants/sequencerConfig';

const isDrumTrackEdited = (trackSteps) => trackSteps.some((step) => step !== 0);

const isDrumPatternEdited = (drumPattern) => {
  const allTracks = Object.values(drumPattern);
  return allTracks.some(isDrumTrackEdited);
};

const isSynthPatternEdited = (synthPatterns, index) => {
  const currentPatternSteps = synthPatterns[index];
  return currentPatternSteps.some((step) => step.note !== null);
};

const checkIfPatternHasData = (state, index) => {
  const hasDrums = isDrumPatternEdited(state.drumsData.patterns[index]);

  const synthKeys = Object.keys(state.synthData);
  const hasSynths = synthKeys.some((synthKey) =>
    isSynthPatternEdited(state.synthData[synthKey].patterns, index),
  );

  return hasDrums || hasSynths;
};

const cloneEmptySynthPattern = () =>
  JSON.parse(JSON.stringify(EMPTY_SYNTH_PATTERN_TEMPLATE));

const generateCleanDrumPattern = (drumKitList) => {
  const cleanDrums = {};
  drumKitList.forEach((drumName) => {
    cleanDrums[drumName] = [...EMPTY_DRUM_TRACK_TEMPLATE];
  });
  return cleanDrums;
};

const pushPatternToAllInstruments = (state, sourceData = null) => {
  const synthKeys = Object.keys(state.synthData);

  synthKeys.forEach((synthKey) => {
    const pattern = sourceData
      ? sourceData.synths[synthKey]
      : cloneEmptySynthPattern();
    state.synthData[synthKey].patterns.push(pattern);
  });

  const drums = sourceData
    ? sourceData.drums
    : generateCleanDrumPattern(state.drumKitList);
  state.drumsData.patterns.push(drums);
};

const createSynthsBackup = (state, targetIndex) => {
  const synthKeys = Object.keys(state.synthData);
  const backup = {};

  synthKeys.forEach((synthKey) => {
    const currentPattern = state.synthData[synthKey].patterns[targetIndex];
    backup[synthKey] = JSON.parse(JSON.stringify(currentPattern));
  });

  return backup;
};

const savePatternToTrashBuffer = (state, targetIndex) => {
  const currentDrumPattern = state.drumsData.patterns[targetIndex];

  state.deletedPatternsBuffer.push({
    synths: createSynthsBackup(state, targetIndex),
    drums: JSON.parse(JSON.stringify(currentDrumPattern)),
  });
};

const forceSplicePatternData = (state, targetIndex) => {
  const synthKeys = Object.keys(state.synthData);

  synthKeys.forEach((synthKey) => {
    state.synthData[synthKey].patterns.splice(targetIndex, 1);
  });
  state.drumsData.patterns.splice(targetIndex, 1);
};

const backupAndDropPatternFromAllInstruments = (state, targetIndex) => {
  const isPatternDirty = checkIfPatternHasData(state, targetIndex);

  if (isPatternDirty) {
    savePatternToTrashBuffer(state, targetIndex);
  }

  forceSplicePatternData(state, targetIndex);
};

const initialState = {
  visibleNotesCount: SEQUENCER_CONFIG.VISIBLE_NOTES_COUNT,
  deletedPatternsBuffer: [],
  synthData: {
    synth1: {
      patterns: [
        [
          // { time: "1:0:0", note: "C5", duration: "2n", velocity: 1.0 },
          { time: '0:0:0', note: 'C4', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C4', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C4', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E4', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C2', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C2', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C2', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E2', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C1', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C1', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C1', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E1', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
      ],
    },
    synth2: {
      patterns: [
        [
          { time: '0:0:0', note: 'C4', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C4', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C4', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E4', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C1', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C1', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C1', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E1', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
        [
          { time: '0:0:0', note: 'C2', duration: '8n' },
          { time: '0:0:1', note: null },
          { time: '0:0:2', note: null },
          { time: '0:0:3', note: null },

          { time: '0:1:0', note: 'C2', duration: '8n' },
          { time: '0:1:1', note: null },
          { time: '0:1:2', note: null },
          { time: '0:1:3', note: null },

          { time: '0:2:0', note: 'C2', duration: '8n' },
          { time: '0:2:1', note: null },
          { time: '0:2:2', note: null },
          { time: '0:2:3', note: null },

          { time: '0:3:0', note: 'E2', duration: '8n' },
          { time: '0:3:1', note: null },
          { time: '0:3:2', note: null },
          { time: '0:3:3', note: null },
        ],
      ],
    },
  },
  drumKitList: [
    'kick',
    'snare',
    'hiHatClose',
    'hiHatOpen',
    'crash',
    'ride',
    'tom',
  ],
  drumsData: {
    patterns: [
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
      {
        kick: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
      {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
        snare: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
        hiHatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        hiHatOpen: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        crash: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ride: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        tom: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
};

export const patternsSlice = createSlice({
  name: 'patterns',
  initialState,
  reducers: {
    setSequencerInstrumentNote: (state, action) => {
      const { instrument, step, note, patternIndex } = action.payload;
      state.synthData[instrument].patterns[patternIndex][step].note = note;
      state.synthData[instrument].patterns[patternIndex][step].duration = '8n';
    },
    toggleDrumStep: (state, action) => {
      const { drumName, stepIndex, patternIndex } = action.payload;
      const currentValue =
        state.drumsData.patterns[patternIndex][drumName][stepIndex];
      state.drumsData.patterns[patternIndex][drumName][stepIndex] =
        currentValue === 1 ? 0 : 1;
    },
    addPatternData: (state) => {
      const hasSavedData = state.deletedPatternsBuffer.length > 0;
      const sourceData = hasSavedData
        ? state.deletedPatternsBuffer.pop()
        : null;
      pushPatternToAllInstruments(state, sourceData);
    },
    backupAndDropPatternData: (state, action) => {
      const targetIndex = action.payload;
      backupAndDropPatternFromAllInstruments(state, targetIndex);
    },
  },
});

export const {
  setSequencerInstrumentNote,
  toggleDrumStep,
  addPatternData,
  backupAndDropPatternData,
} = patternsSlice.actions;

export default patternsSlice.reducer;
