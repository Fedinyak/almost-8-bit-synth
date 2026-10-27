import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';

// --- СЕМАНТИЧЕСКИЕ ПРЕДИКАТЫ ДЛЯ СНИЖЕНИЯ КОГНИТИВНОЙ НАГРУЗКИ ---
const isMissing = (target) => !target;

const extractEnvelopeValues = (settings) => ({
  attack: settings?.attack ?? AUDIO_DEFAULT_ATTACK,
  decay: settings?.decay ?? AUDIO_DEFAULT_DECAY,
  sustain: settings?.sustain ?? AUDIO_DEFAULT_SUSTAIN,
  release: settings?.release ?? AUDIO_DEFAULT_RELEASE,
});

const applySynthEnvelopeTrack = (synthInstance, settings) => {
  const envelopeState = synthInstance?.instrument?.envelope;
  if (isMissing(envelopeState) || isMissing(settings)) return;

  const envelopeValues = extractEnvelopeValues(settings);

  // Профессиональный маппинг: переносим живые секунды ADSR из Redux в нативные ключи ядра синта
  envelopeState.attackTime = envelopeValues.attack;
  envelopeState.decayTime = envelopeValues.decay;
  envelopeState.sustainLevel = envelopeValues.sustain;
  envelopeState.releaseTime = envelopeValues.release;
};

const applyDrumEnvelopeTrack = (drumInstance, settings) => {
  const drumAdapter = drumInstance?.instrument;
  if (
    isMissing(drumAdapter) ||
    isMissing(drumAdapter.envelope) ||
    isMissing(settings)
  )
    return;

  // Маппинг для ударных: записываем Атаку и Спад напрямую в паспорт голоса барабана
  drumAdapter.envelope.attack = settings.attack ?? AUDIO_DEFAULT_ATTACK;
  drumAdapter.envelope.decay = settings.decay ?? AUDIO_DEFAULT_DECAY;
  drumAdapter.envelope.release = settings.release ?? AUDIO_DEFAULT_RELEASE;
};

const syncSynthEnvelopes = (synthEngines, soundSettings, synthList) => {
  const total = synthList.length;
  for (let i = 0; i < total; i++) {
    const name = synthList[i];
    const synthInstance = synthEngines[name];
    const settings = soundSettings[name];
    applySynthEnvelopeTrack(synthInstance, settings);
  }
};

const syncDrumEnvelopes = (drumsEngine, soundSettings, drumKitList) => {
  const total = drumKitList.length;
  for (let i = 0; i < total; i++) {
    const name = drumKitList[i];
    const drumInstance = drumsEngine?.[name];
    const settings = soundSettings[name];
    applyDrumEnvelopeTrack(drumInstance, settings);
  }
};

// --- АГРЕГИРУЮЩИЕ КОНВЕЙЕРЫ СИНХРОНИЗАЦИИ ---

/**
 * Унифицированный конвейер синхронизации огибающих. Чистый Bridge-модуль,
 * который на лету поставляет секунды ADSR/AR с крутилок UI в нативные DSP-движки.
 */
export const syncAllEnvelopes = ({
  synthEngines,
  drumsEngine,
  soundSettings,
  SYNTH_LIST,
  DRUM_KIT_LIST,
}) => {
  syncSynthEnvelopes(synthEngines, soundSettings, SYNTH_LIST);
  syncDrumEnvelopes(drumsEngine, soundSettings, DRUM_KIT_LIST);
};
