import {
  AUDIO_DEFAULT_ATTACK,
  AUDIO_DEFAULT_DECAY,
  AUDIO_DEFAULT_SUSTAIN,
  AUDIO_DEFAULT_RELEASE,
} from '../../constants/audioEngineConfig';

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

  drumAdapter.envelope.attack = settings.attack ?? AUDIO_DEFAULT_ATTACK;
  drumAdapter.envelope.decay = settings.decay ?? AUDIO_DEFAULT_DECAY;
  drumAdapter.envelope.release = settings.release ?? AUDIO_DEFAULT_RELEASE;
};

const syncSynthEnvelopes = (synthEngines, soundSettings, synthList, cache) => {
  const total = synthList.length;
  for (let i = 0; i < total; i++) {
    const name = synthList[i];
    const settings = soundSettings[name];

    // Вытаскиваем чистые примитивы для проверки
    const atk = settings?.attack ?? AUDIO_DEFAULT_ATTACK;
    const dec = settings?.decay ?? AUDIO_DEFAULT_DECAY;
    const sus = settings?.sustain ?? AUDIO_DEFAULT_SUSTAIN;
    const rel = settings?.release ?? AUDIO_DEFAULT_RELEASE;
    const type = settings?.engineType ?? 'monoSynth';

    // Защита от залипания паттернов: если хоть одно число изменилось или сменился пресет, шьем граф
    if (
      cache &&
      cache[`env_atk_${name}`] === atk &&
      cache[`env_dec_${name}`] === dec &&
      cache[`env_sus_${name}`] === sus &&
      cache[`env_rel_${name}`] === rel &&
      cache[`env_type_${name}`] === type
    ) {
      continue;
    }

    if (cache) {
      cache[`env_atk_${name}`] = atk;
      cache[`env_dec_${name}`] = dec;
      cache[`env_sus_${name}`] = sus;
      cache[`env_rel_${name}`] = rel;
      cache[`env_type_${name}`] = type;
    }

    const synthInstance = synthEngines[name];
    applySynthEnvelopeTrack(synthInstance, settings);
  }
};

const syncDrumEnvelopes = (drumsEngine, soundSettings, drumKitList, cache) => {
  const total = drumKitList.length;
  for (let i = 0; i < total; i++) {
    const name = drumKitList[i];
    const settings = soundSettings[name];

    const atk = settings?.attack ?? AUDIO_DEFAULT_ATTACK;
    const dec = settings?.decay ?? AUDIO_DEFAULT_DECAY;
    const rel = settings?.release ?? AUDIO_DEFAULT_RELEASE;

    if (
      cache &&
      cache[`env_atk_${name}`] === atk &&
      cache[`env_dec_${name}`] === dec &&
      cache[`env_rel_${name}`] === rel
    ) {
      continue;
    }

    if (cache) {
      cache[`env_atk_${name}`] = atk;
      cache[`env_dec_${name}`] = dec;
      cache[`env_rel_${name}`] = rel;
    }

    const drumInstance = drumsEngine?.[name];
    applyDrumEnvelopeTrack(drumInstance, settings);
  }
};

export const syncAllEnvelopes = ({
  synthEngines,
  drumsEngine,
  soundSettings,
  SYNTH_LIST,
  DRUM_KIT_LIST,
  cache,
}) => {
  syncSynthEnvelopes(synthEngines, soundSettings, SYNTH_LIST, cache);
  syncDrumEnvelopes(drumsEngine, soundSettings, DRUM_KIT_LIST, cache);
};
