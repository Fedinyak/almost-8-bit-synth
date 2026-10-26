// --- НАСТРОЙКИ СИНТЕЗА И ФИЗИЧЕСКИЕ КОНСТАНТЫ DSP ---
const NOISE_BUFFER_DURATION_SEC = 2.0;
const KICK_START_FREQ_HZ = 180;
const KICK_END_FREQ_HZ = 45;
const KICK_PITCH_DECAY_SEC = 0.08;

const SNARE_FILTER_FREQ_HZ = 1000;
const SNARE_FILTER_Q_VALUE = 1.0;
const HATHAT_FILTER_FREQ_HZ = 3000;

// Генерация нативного буфера белого шума
const createNoiseBuffer = (ctx) => {
  const bufferSize = ctx.sampleRate * NOISE_BUFFER_DURATION_SEC;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

// Низкоуровневый синтез MembraneSynth (Бочка / Кик)
export const synthesisMembraneDrum = (ctx, targetNode, ctxTime, duration) => {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(KICK_START_FREQ_HZ, ctxTime);
  osc.frequency.exponentialRampToValueAtTime(
    KICK_END_FREQ_HZ,
    ctxTime + KICK_PITCH_DECAY_SEC,
  );
  osc.connect(targetNode);
  osc.start(ctxTime);
  osc.stop(ctxTime + duration);
};

// Низкоуровневый синтез NoiseSynth/MetalSynth (Снейр / Хэт)
export const synthesisNoiseDrum = (
  ctx,
  targetNode,
  drumName,
  ctxTime,
  duration,
) => {
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = createNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  const isSnare = drumName.toLowerCase().includes('snare');

  filter.type = isSnare ? 'bandpass' : 'highpass';
  filter.frequency.setValueAtTime(
    isSnare ? SNARE_FILTER_FREQ_HZ : HATHAT_FILTER_FREQ_HZ,
    ctxTime,
  );
  if (isSnare) filter.Q.value = SNARE_FILTER_Q_VALUE;

  noiseSource.connect(filter);
  filter.connect(targetNode);
  noiseSource.start(ctxTime);
  noiseSource.stop(ctxTime + duration);
};
