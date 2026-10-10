import { triggerDrumVisualLevel } from '../core/audioEngineCore';
import { compensateLatency } from '../../utils/audioMathUtils';
import { getNativeContext } from '../core/nativeContext';

export const playSynthNote = (synth, time, noteData) => {
  if (synth && synth.instrument) {
    synth.instrument.triggerAttackRelease(
      noteData.note,
      noteData.duration,
      time,
    );
  }
};

export const playDrumHit = (drumInstrument, drumDuration, playTime) => {
  drumInstrument.triggerAttackRelease(drumDuration, playTime);
};

export const processDrumPlaybackHit = (
  time,
  noteData,
  engine,
  drumNoteMap,
  release,
) => {
  const instrumentName = drumNoteMap[noteData.note];

  const drumContainer = engine[instrumentName];
  if (!drumContainer || !drumContainer.instrument) return;

  const playTime = compensateLatency(time);

  playDrumHit(drumContainer.instrument, release, playTime);

  if (typeof noteData.drumIndex === 'number') {
    triggerDrumVisualLevel(noteData.drumIndex, playTime);
  }
};

// --- НАДРОДНАЯ КОММУТАЦИЯ МИКШЕРА ---
export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (!synthInstance?.output) return;

  // Безопасно отключаем старые провода, если они были
  if (typeof synthInstance.output.disconnect === 'function') {
    try {
      synthInstance.output.disconnect();
    } catch (e) {}
  }

  try {
    // 1. Если канал микшера — это объект Tone.js (например, Tone.Volume),
    // у него есть встроенный и очень надежный метод .connect(), который съест любой нативный узел!
    if (channel && typeof channel.connect === 'function') {
      // Подключаем нативный выход синта прямо в Tone-канал
      synthInstance.output.connect(channel);

      // 2. Связываем канал с анализатором спектра
      if (analyser) {
        channel.connect(analyser);
      }

      // 3. Отправляем канал на финальный выход. Если у него есть toDestination — вызываем его
      if (typeof channel.toDestination === 'function') {
        channel.toDestination();
      }
    } else {
      // Фолбек для полностью нативного графа (когда вырежем Tone.js из микшера)
      const ctx = getNativeContext();
      if (channel && typeof channel.connect === 'function') {
        synthInstance.output.connect(channel);
        if (analyser) channel.connect(analyser);
        channel.connect(ctx.destination);
      }
    }
  } catch (err) {
    // Тихо подстраховываем, если на стыке фаз что-то пошло не так
    if (channel && typeof channel.toDestination === 'function') {
      try {
        channel.toDestination();
      } catch (e) {}
    }
  }
};
