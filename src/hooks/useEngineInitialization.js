import { useEffect } from 'react';
import { useAudioEngineSync } from './useAudioEngineSync';
import { useAudioPlaybackControl } from './useAudioPlaybackControl';
import { useSequencerScheduler } from './useSequencerScheduler';

// =========================================================================
// БЕССМЕРТНЫЙ ГЛОБАЛЬНЫЙ РЕЕСТР АУДИО-ДВИЖКА (АНАЛОГ ВНУТРЕННЕЙ СХЕМЫ TONE.JS)
// Эти объекты вынесены за пределы жизненного цикла React-компонентов.
// Они монолитно сидят в памяти JS-модуля, никогда не сбрасываются при re-render
// и полностью ликвидируют прерывание звука "би-би-биии" при кручении ручек.
// =========================================================================
const globalSynthEnginesRef = { current: {} };
const globalSynthPartRef = { current: {} };
const globalDrumsEngineRef = { current: null };
const globalDrumsPartRef = { current: null };

export const useEngineInitialization = () => {
  // СТАРАЯ КОСТЫЛЬНАЯ ВЕРСИЯ (СБРАСЫВАЛАСЬ REACT-ОМ В ПУСТОЙ ОБЪЕКТ):
  // const synthEnginesRef = useRef({});
  // const synthPartRef = useRef({});
  // const drumsEngineRef = useRef(null);
  // const drumsPartRef = useRef(null);

  // Прокидываем вниз по конвейеру наши бессмертные глобальные ссылки
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
