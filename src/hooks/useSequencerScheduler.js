import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPendingPattern,
  setCurrentPlayPatternIndex,
  setCurrentStep,
} from '../slices/sequencerSlice';
import {
  STEPS_IN_MEASURE,
  STEP_DURATION_NOTATION,
} from '../constants/constants';
import {
  calculateCurrentPlayPattern,
  calculateCurrentStep,
  getTotalSteps,
} from '../utility/audioMathUtils';
import {
  disableEngineLoop,
  enableEngineLoop,
  scheduleFrame,
  setEnginePosition,
  startDrawingLoop,
  stopDrawingLoop,
} from '../utility/audioEngineCore';

const handleStepSync = (
  time,
  totalStepsRef,
  pendingPatternRef,
  isPatternLoopRef,
  dispatch,
) => {
  const currentStep = calculateCurrentStep(time, totalStepsRef.current);
  const currentPlayPattern = calculateCurrentPlayPattern(
    currentStep,
    STEPS_IN_MEASURE,
  );
  const stepInPattern = currentStep % STEPS_IN_MEASURE;

  if (stepInPattern === 15) {
    const nextPattern = pendingPatternRef.current;
    const isLoopActive = isPatternLoopRef.current;

    if (nextPattern !== null) {
      disableEngineLoop();
      setEnginePosition(nextPattern);

      scheduleFrame(time, () => {
        dispatch(setCurrentPlayPatternIndex(nextPattern));
        dispatch(setCurrentStep(nextPattern * STEPS_IN_MEASURE));
        dispatch(clearPendingPattern());
      });
      return;
    }

    if (isLoopActive) {
      enableEngineLoop(currentPlayPattern);

      scheduleFrame(time, () => {
        dispatch(setCurrentStep(currentStep));
      });
      return;
    } else {
      disableEngineLoop();
    }
  }

  scheduleFrame(time, () => {
    dispatch(setCurrentStep(currentStep));
    dispatch(setCurrentPlayPatternIndex(currentPlayPattern));
  });
};

export const useSequencerScheduler = () => {
  const dispatch = useDispatch();

  const pendingPatternIndex = useSelector(
    (state) => state.sequencer.pendingPatternIndex,
  );
  const isLooping = useSelector((state) => state.sequencer.isLooping);
  const drumsList = useSelector((state) => state.sequencer.drumsData);
  const totalSteps = getTotalSteps(drumsList?.patterns, STEPS_IN_MEASURE);

  const pendingPatternRef = useRef(null);
  const isPatternLoopRef = useRef(null);
  const totalStepsRef = useRef(totalSteps);

  useEffect(() => {
    totalStepsRef.current = totalSteps;
  }, [totalSteps]);

  useEffect(() => {
    pendingPatternRef.current = pendingPatternIndex;
  }, [pendingPatternIndex]);

  useEffect(() => {
    isPatternLoopRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    const drawingProcess = startDrawingLoop(
      (time) =>
        handleStepSync(
          time,
          totalStepsRef,
          pendingPatternRef,
          isPatternLoopRef,
          dispatch,
        ),
      STEP_DURATION_NOTATION,
    );

    return () => stopDrawingLoop(drawingProcess);
  }, [dispatch]);
};
