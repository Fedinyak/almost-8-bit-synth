export const getPatternVisualFlags = ({
  index,
  sequencerPlayState,
  pendingPatternIndex,
  currentPlayPatternIndex,
  isLooping,
  selectedPatternIndex,
  isFollowMode,
}) => {
  const isPlaying = sequencerPlayState === 'start';
  const isActivePlayback = currentPlayPatternIndex === index;

  const isPlayWaiting =
    isPlaying && pendingPatternIndex === index && !isLooping;

  const isLoopWaiting =
    isPlaying &&
    isLooping &&
    !isActivePlayback &&
    (selectedPatternIndex === index || pendingPatternIndex === index);

  const isLoopActive =
    isLooping &&
    (isPlaying
      ? isActivePlayback &&
        (pendingPatternIndex === null || pendingPatternIndex === index)
      : selectedPatternIndex === index ||
        (selectedPatternIndex === false && index === 0));

  return {
    isPlayWaiting,
    isLoopWaiting,
    isLoopActive,
    isActivePlayback,
  };
};
