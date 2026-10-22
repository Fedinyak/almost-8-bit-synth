import { SEQUENCER_CONFIG } from '../../constants/sequencerConfig';
import { calculateNextHardwareCoordinates } from '../../utils/audioMathUtils';

let step = 0;
let pattern = 0;
let maxPatterns = SEQUENCER_CONFIG.DEFAULT_PATTERN_COUNT || 3;
let isLooping = false;
let pendingJumpIndex = null;

export const schedulerPlayhead = {
  getCoordinates() {
    return { currentStep: step, currentPattern: pattern };
  },

  getConfig() {
    return { isLooping, pendingJumpIndex, maxPatterns };
  },

  setLoopState(newIsLooping, selectedIndex, pendingIndex) {
    isLooping = newIsLooping;
    if (typeof pendingIndex === 'number') {
      pendingJumpIndex = pendingIndex;
    } else if (typeof selectedIndex === 'number' && newIsLooping) {
      pendingJumpIndex = selectedIndex;
    } else {
      pendingJumpIndex = null;
    }
  },

  setMaxPatterns(count) {
    maxPatterns = count;
  },

  reset(startingPattern = 0) {
    step = 0;
    pattern = typeof startingPattern === 'number' ? startingPattern : 0;
  },

  /**
   * Декларативный сдвиг курсора на следующий шаг секвенсора
   */
  advance() {
    const nextState = calculateNextHardwareCoordinates(
      schedulerPlayhead.getCoordinates(),
      schedulerPlayhead.getConfig(),
    );

    step = nextState.nextStep;
    pattern = nextState.nextPattern;
    pendingJumpIndex = nextState.nextJumpIndex;
  },
};
