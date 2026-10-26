import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { transport } from '../audio/timeline/transport';
import { scheduler } from '../audio/timeline/scheduler'; // Импортируем наше нативное ядро часов

export const useAudioPlaybackControl = () => {
  const bpm = useSelector((state) => state.player.bpm);
  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );

  // Централизованный старт аппаратных аудио-часов и изменение стейта транспорта
  useEffect(() => {
    // 1. Обновляем флаги воспроизведения и сбрасываем секунды внутри транспорта
    transport.setPlayState(sequencerPlayState);

    // 2. Аппаратно запускаем или останавливаем низкоуровневый setInterval шедулера
    scheduler.updateState(sequencerPlayState);
  }, [sequencerPlayState]);

  // Синхронизируем изменение BPM из Redux-стейта с нативным транспортом часов
  useEffect(() => {
    if (bpm) {
      transport.bpm = bpm;
    }
  }, [bpm]);
};
