import { PLAYBACK_STATES } from '../store/playerSlice';

// --- САМОДОКУМЕНТИРОВАННЫЕ FP ПРЕДИКАТЫ ---
const isPlayingState = (state) => state === PLAYBACK_STATES.START;
const isCurrentPatternPlaying = (currentPlayIndex, index) =>
  currentPlayIndex === index;
const isPatternPendingTransition = (pendingIndex, index) =>
  pendingIndex === index;

const isNoPendingOrTargetingSelf = (pendingIndex, index) => {
  return pendingIndex === null || pendingIndex === index;
};

const isPatternSelectedOrFallbackFirst = (selectedIndex, index) => {
  return selectedIndex === index || (selectedIndex === false && index === 0);
};

// --- ВЫЧИСЛЕНИЕ СПЛОШНОГО ГОРЕНИЯ КНОПКИ LOOP ---
const calculateLoopActiveStatus = ({
  isPlaying,
  isLooping,
  isActivePlayback,
  pendingPatternIndex,
  selectedPatternIndex,
  index,
}) => {
  if (!isLooping) return false;

  if (isPlaying) {
    return (
      isActivePlayback && isNoPendingOrTargetingSelf(pendingPatternIndex, index)
    );
  }

  return isPatternSelectedOrFallbackFirst(selectedPatternIndex, index);
};

/**
 * КРИСТАЛЬНАЯ МАТРИЦА ИНДИКАЦИИ НА ОСНОВЕ ФИЗИЧЕСКИХ КООРДИНАТ ПЛЕЕРА
 *
 * Мы считаем флаги кнопок, опираясь только на реальный звук и маркер клика,
 * полностью исключая ложные вспышки от перемещения экрана редактирования (selectedPatternIndex).
 */
export const getPatternVisualFlags = ({
  index,
  sequencerPlayState,
  pendingPatternIndex,
  currentPlayPatternIndex,
  isLooping,
  selectedPatternIndex,
  isFollowMode,
}) => {
  const isPlaying = isPlayingState(sequencerPlayState);

  // Железные маркеры физического состояния звукового движка
  const isActivePlayback = isCurrentPatternPlaying(
    currentPlayPatternIndex,
    index,
  );

  // Маркер намерения: совпадает ли индекс этой кнопки с тем, куда нажал пользователь
  const isTargetPending = isPatternPendingTransition(
    pendingPatternIndex,
    index,
  );

  // --- 1. РАСЧЕТ ИНДИКАЦИИ КНОПКИ PLAY (▶) ---
  // Мигает строго тогда, когда идет обычный квантованный переход, и луп выключен
  const isPlayWaiting = isPlaying && isTargetPending && !isLooping;

  // --- 2. РАСЧЕТ МИГАНИЯ КНОПКИ LOOP (Ожидание квантования) ---
  // ЖЕСТКИЙ ЗАПРЕТ: Кнопка лупа мигает ТОЛЬКО тогда, когда музыка играет,
  // включен режим петли, этот паттерн СЕЙЧАС НЕ воспроизводится,
  // но именно в него забит отложенный буфер прыжка (pendingPatternIndex === index).
  // Ни один играющий или соседний паттерн физически не сможет перехватить этот статус!
  const isLoopWaiting =
    isPlaying && isLooping && !isActivePlayback && isTargetPending;

  // --- 3. РАСЧЕТ СПЛОШНОГО ГОРЕНИЯ КНОПКИ LOOP (Луп активен) ---
  // ЖЕСТКИЙ ЗАПРЕТ: Во время игры кнопка горит синим цветом ТОЛЬКО на том паттерне,
  // который реально звучит из колонок (isActivePlayback). И только если в очереди
  // квантования не висит чужой отложенный прыжок (pendingPatternIndex === null || pendingPatternIndex === index).
  // Это полностью блокирует ложное загорание синей кнопки на 1-м или 2-м паттерне во время ожидания 3-го!
  const isLoopActive = calculateLoopActiveStatus({
    isPlaying,
    isLooping,
    isActivePlayback,
    pendingPatternIndex,
    selectedPatternIndex,
    index,
  });

  return {
    isPlayWaiting,
    isLoopWaiting,
    isLoopActive,
    isActivePlayback,
  };
};
