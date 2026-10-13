export const getPatternVisualFlags = ({
  index,
  sequencerPlayState,
  pendingPatternIndex,
  currentPlayPatternIndex,
  isLooping,
  selectedPatternIndex,
}) => {
  const isPlaying = sequencerPlayState === 'start';
  const isActivePlayback = currentPlayPatternIndex === index;

  // Паттерн ждет очереди, если на него нажали PLAY
  const isTargetPending = pendingPatternIndex === index;

  const isPlayWaiting = isPlaying && isTargetPending && !isLooping;

  // Ожидание квантования лупа: музыка играет, включен луп, этот паттерн СЕЙЧАС НЕ играет на самом деле,
  // но пользователь выбрал именно его через экшен (selectedPatternIndex равен index)
  const isLoopWaiting =
    isPlaying &&
    !isActivePlayback &&
    isLooping &&
    (selectedPatternIndex === index || isTargetPending);

  // ИСПРАВЛЕНО: Активный луп горит только тогда, когда включен режим лупа,
  // паттерн физически воспроизводится И этот паттерн совпадает с выбранным в UI лупом.
  // Это полностью исключает ложное подсвечивание кнопки loop на текущем паттерне во время квантования.
  const isLoopActive =
    isLooping &&
    isActivePlayback &&
    (selectedPatternIndex === index || selectedPatternIndex === false);

  return {
    isPlayWaiting,
    isLoopWaiting,
    isLoopActive,
    isActivePlayback,
  };
};
