import { AUDIO_DEFAULT_VOLUME } from '../../constants/audioEngineConfig';
import { nativeRampTo } from '../dsp/audioGraphUtils';

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
} from '../bridge/effectModulationActions';

// Реэкспорт инициализации маршрутов из жизненного цикла, чтобы хук синхронизации не падал
export { initializeAudioRouting } from '../context/audioLifecycleActions';

// --- КОНСТАНТЫ ПАРАМЕТРОВ МОДУЛЯЦИИ ---
const RAMP_DURATION_SEC = 0.05;
const DEFAULT_PAN_CENTER_VALUE = 0.0;

// --- САМОДОКУМЕНТИРОВАННЫЕ FP ПРЕДИКАТЫ ---
const isMissing = (target) => !target;

const hasNativeVolumeControl = (instrument) =>
  !!(instrument && typeof instrument.setVolume === 'function');

const hasAudioInstance = (instance) => !!instance?.instrument;

const hasDefinedVolume = (settings) =>
  !!(settings && settings.volume !== undefined);

const hasDefinedPan = (settings) => !!(settings && settings.pan !== undefined);

const isTargetVolumeValid = (instance, settings) =>
  hasAudioInstance(instance) && hasDefinedVolume(settings);

const isTargetPanValid = (instance, settings) =>
  !!(instance && instance.panner && hasDefinedPan(settings));

// --- ДЕКЛАРАТИВНЫЕ ПОДФУНКЦИИ ОБРАБОТКИ СИГНАЛА ---

export const updateInstrumentVolume = (instrument, volumeValue) => {
  if (isMissing(instrument)) return;

  const targetVolume = volumeValue ?? AUDIO_DEFAULT_VOLUME;

  // ПРЕВЕНТИВНОЕ СГЛАЖИВАНИЕ: Если у ядра есть нативный AudioParam .volume — всегда отдаем
  // приоритет плавному экспоненциальному рампу, полностью защищая тракт от щелчков
  if (instrument.volume) {
    nativeRampTo(instrument.volume, targetVolume, RAMP_DURATION_SEC);
    return;
  }

  if (hasNativeVolumeControl(instrument)) {
    instrument.setVolume(targetVolume);
    return;
  }
};

export const updateInstrumentPan = (pannerNode, panValue) => {
  if (isMissing(pannerNode)) return;

  const targetPan = panValue ?? DEFAULT_PAN_CENTER_VALUE;

  // Извлекаем нативный аудиопараметр .pan, если нам передали сам узел StereoPannerNode
  const targetParam = pannerNode.pan || pannerNode;

  // Плавно изменяем панораму на нативном StereoPannerNode рэка
  nativeRampTo(targetParam, targetPan, RAMP_DURATION_SEC);
};

const updateVolumeTrack = (instance, settings) => {
  if (isTargetVolumeValid(instance, settings)) {
    updateInstrumentVolume(instance.instrument, settings.volume);
  }
};

const updatePanTrack = (instance, settings) => {
  if (isTargetPanValid(instance, settings)) {
    updateInstrumentPan(instance.panner, settings.pan);
  }
};

const syncSynthVolumes = (synthEngines, soundSettings, synthList, cache) => {
  const total = synthList.length;
  for (let i = 0; i < total; i++) {
    const name = synthList[i];
    const settings = soundSettings[name];

    if (cache && cache[`vol_${name}`] === settings) continue;
    if (cache) cache[`vol_${name}`] = settings;

    const synthInstance = synthEngines[name];
    updateVolumeTrack(synthInstance, settings);
  }
};

const syncDrumVolumes = (drumsEngine, soundSettings, drumKitList, cache) => {
  const total = drumKitList.length;
  for (let i = 0; i < total; i++) {
    const name = drumKitList[i];
    const settings = soundSettings[name];

    if (cache && cache[`vol_${name}`] === settings) continue;
    if (cache) cache[`vol_${name}`] = settings;

    const drumInstance = drumsEngine?.[name];
    updateVolumeTrack(drumInstance, settings);
  }
};

const syncSynthPans = (synthEngines, soundSettings, synthList, cache) => {
  const total = synthList.length;
  for (let i = 0; i < total; i++) {
    const name = synthList[i];
    const settings = soundSettings[name];

    if (cache && cache[`pan_${name}`] === settings) continue;
    if (cache) cache[`pan_${name}`] = settings;

    const synthInstance = synthEngines[name];
    updatePanTrack(synthInstance, settings);
  }
};

const syncDrumPans = (drumsEngine, soundSettings, drumKitList, cache) => {
  const total = drumKitList.length;
  for (let i = 0; i < total; i++) {
    const name = drumKitList[i];
    const settings = soundSettings[name];

    if (cache && cache[`pan_${name}`] === settings) continue;
    if (cache) cache[`pan_${name}`] = settings;

    const drumInstance = drumsEngine?.[name];
    updatePanTrack(drumInstance, settings);
  }
};

// --- АГРЕГИРУЮЩИЕ КОНВЕЙЕРЫ СИНХРОНИЗАЦИИ ---

/**
 * Агрегирующий конвейер синхронизации уровней громкости всех инструментов
 */
export const syncAllVolumes = ({
  synthEngines,
  drumsEngine,
  soundSettings,
  SYNTH_LIST,
  DRUM_KIT_LIST,
  cache,
}) => {
  syncSynthVolumes(synthEngines, soundSettings, SYNTH_LIST, cache);
  syncDrumVolumes(drumsEngine, soundSettings, DRUM_KIT_LIST, cache);
};

/**
 * Агрегирующий конвейер синхронизации стерео-панорамы всех каналов рэка
 */
export const syncAllPans = ({
  synthEngines,
  drumsEngine,
  soundSettings,
  SYNTH_LIST,
  DRUM_KIT_LIST,
  cache,
}) => {
  syncSynthPans(synthEngines, soundSettings, SYNTH_LIST, cache);
  syncDrumPans(drumsEngine, soundSettings, DRUM_KIT_LIST, cache);
};
