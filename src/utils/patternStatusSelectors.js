export const getPatternVisualFlags = ({
  index,
  sequencerPlayState,
  pendingPatternIndex,
  currentPlayPatternIndex,
  isLooping,
  selectedPatternIndex,
  isFollowMode, // Добавляем флаг режима следования для автоматического сброса фокуса
}) => {
  const isPlaying = sequencerPlayState === 'start';
  const isActivePlayback = currentPlayPatternIndex === index;

  // Если включен режим следования за экраном (Follow Mode),
  // мы игнорируем ручной выбор паттерна, так как интерфейс обязан прыгать за музыкой
  const effectiveSelectedIndex = isFollowMode ? false : selectedPatternIndex;

  // Паттерн ждет очереди, если на него нажали PLAY
  const isTargetPending = pendingPatternIndex === index;

  const isPlayWaiting = isPlaying && isTargetPending && !isLooping;

  // Ожидание квантования лупа: музыка играет, включен луп, этот паттерн СЕЙЧАС НЕ играет на самом деле,
  // но пользователь выбрал именно его через экшен (effectiveSelectedIndex равен index)
  const isLoopWaiting =
    isPlaying &&
    !isActivePlayback &&
    isLooping &&
    (effectiveSelectedIndex === index || isTargetPending);

  // Активный луп горит только тогда, когда включен режим лупа,
  // паттерн физически воспроизводится И этот паттерн совпадает с выбранным в UI лупом.
  const isLoopActive =
    isLooping &&
    isActivePlayback &&
    (effectiveSelectedIndex === index || effectiveSelectedIndex === false);

  return {
    isPlayWaiting,
    isLoopWaiting,
    isLoopActive,
    isActivePlayback,
  };
};
