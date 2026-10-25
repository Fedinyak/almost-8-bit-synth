import { AUDIO_DEFAULT_VOLUME } from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../core/audioGraphUtils';

// Декларативный реэкспорт доменных модулей для сохранения внешних контрактов
export {
  updateInstrumentEnvelope,
  applySynthEnvelope,
} from './synthEnvelopeActions';
export {
  updateEffectParam,
  logBypassTransition,
  toggleNodeBypass,
  applyDynamicBypass,
} from './effectModulationActions';

// Реэкспорт инициализации маршрутов из жизненного цикла, чтобы хук синхронизации не падал
export { initializeAudioRouting } from './audioLifecycleActions';

// --- КОНСТАНТЫ ПАРАМЕТРОВ МОДУЛЯЦИИ ---
const RAMP_DURATION_SEC = 0.05;

// --- САМОДОКУМЕНТИРОВАННЫЕ FP ПРЕДИКАТЫ ---
const isMissing = (target) => !target;
const hasNativeVolumeControl = (instrument) =>
  instrument && typeof instrument.setVolume === 'function';

/**
 * Декларативное управление громкостью инстанса (Полиморфный VCA-интерфейс)
 * Занимается строго применением mix-баланса, скрывая детали реализации приборов
 */
export const updateInstrumentVolume = (instrument, volumeValue) => {
  if (isMissing(instrument)) return;

  const targetVolume = volumeValue ?? AUDIO_DEFAULT_VOLUME;

  if (hasNativeVolumeControl(instrument)) {
    instrument.setVolume(targetVolume);
    return;
  }

  if (instrument.volume) {
    nativeRampTo(instrument.volume, targetVolume, RAMP_DURATION_SEC);
  }
};
