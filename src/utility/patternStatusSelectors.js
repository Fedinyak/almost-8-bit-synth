export const getPatternVisualFlags = ({
  index,
  sequencerPlayState,
  pendingPatternIndex,
  currentPlayPatternIndex,
  isLooping,
}) => {
  const isPlaying = sequencerPlayState === 'start';
  const isTargetPending = pendingPatternIndex === index;
  const isActivePlayback = currentPlayPatternIndex === index;

  const isPlayWaiting = isPlaying && isTargetPending && !isLooping;

  const isLoopWaiting =
    isPlaying && isTargetPending && isLooping && !isActivePlayback;

  const isLoopActive =
    isLooping &&
    isActivePlayback &&
    (pendingPatternIndex === null || isTargetPending);

  return {
    isPlayWaiting,
    isLoopWaiting,
    isLoopActive,
    isActivePlayback,
  };
};
