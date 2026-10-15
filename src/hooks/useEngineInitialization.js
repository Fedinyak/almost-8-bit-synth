import { useAudioEngineSync } from './useAudioEngineSync';
import { useAudioPlaybackControl } from './useAudioPlaybackControl';
import { useSequencerScheduler } from './useSequencerScheduler';

// =========================================================================
// СТАТИЧЕСКИЕ ОБЪЕКТЫ-ОБЕРТКИ: Живут вечно вне жизненного цикла React.
// Наш планировщик секвенсора и дорожки воспроизведения будут забирать
// ссылки из этих стабильных контейнеров.
// =========================================================================
const globalSynthEnginesRef = { current: {} };
const globalSynthPartRef = { current: {} };
const globalDrumsEngineRef = { current: null };
const globalDrumsPartRef = { current: null };

export const useEngineInitialization = () => {
  // Прокидываем вниз по конвейеру наши вечные ссылки
  useAudioEngineSync(
    globalSynthEnginesRef,
    globalSynthPartRef,
    globalDrumsEngineRef,
    globalDrumsPartRef,
  );

  useAudioPlaybackControl();

  useSequencerScheduler();

  return null;
};

export default useEngineInitialization;
