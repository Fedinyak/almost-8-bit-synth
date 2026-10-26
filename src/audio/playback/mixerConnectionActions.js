import { getNativeContext } from '../core/nativeContext';

const isOutputNodeMissing = (instance) => !instance || !instance.output;
const isAudioNodeConnectable = (node) =>
  node && typeof node.connect === 'function';

/**
 * Безопасно разрывает старые кабельные соединения Web Audio API для предотвращения наложения сигналов
 */
const safelyDisconnectOutput = (outputNode) => {
  if (typeof outputNode.disconnect === 'function') {
    try {
      outputNode.disconnect();
    } catch (error) {}
  }
};

/**
 * Декларативно протягивает сигнальный тракт: Инструмент -> Канал Громкости -> Анализатор -> Выход
 */
const routeThroughMixerChannel = (ctx, outputNode, channel, analyser) => {
  outputNode.connect(channel.input || channel);

  if (analyser) {
    channel.connect(analyser);
  }

  // Если у твоего кастомного канала есть метод toDestination, вызываем его, иначе шлем на мейн
  if (typeof channel.toDestination === 'function') {
    channel.toDestination();
    return;
  }

  channel.connect(ctx.destination);
};

/**
 * Коммутирует финальный выход синтезатора или барабана с его канальной линейкой в микшере
 */
export const connectSynthToMixer = (synthInstance, channel, analyser) => {
  if (isOutputNodeMissing(synthInstance) || !isAudioNodeConnectable(channel))
    return;

  const { output } = synthInstance;
  safelyDisconnectOutput(output);

  const ctx = getNativeContext();
  routeThroughMixerChannel(ctx, output, channel, analyser);
};
