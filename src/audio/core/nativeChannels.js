import { ANALYSER_SIZE } from '../../constants/audioEngineConfig';
import {
  dbToLinearGain,
  linearGainToDb,
  isParamChangeSignificant,
} from '../../utils/audioMathUtils';
import { getNativeContext } from './nativeContext';

// --- САМОДОКУМЕНТИРОВАННЫЕ ПРЕДИКАТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const isNodeMissing = (node) => !node;
const canConnect = (destination) =>
  destination && typeof destination.connect === 'function';

/**
 * Чистая утилита извлечения точки входа для нативной коммутации узлов
 */
const extractDestinationNode = (target) => {
  if (isNodeMissing(target)) return null;
  return target.input || target._gainNode || target;
};

/**
 * Декларативная фабрика создания независимого аудио-канала (Channel Strip)
 */
export const createAudioChannel = () => {
  const ctx = getNativeContext();
  const nativeGain = ctx.createGain();

  const getVolume = () => linearGainToDb(nativeGain.gain.value);

  const setVolume = (dbValue) => {
    const linearGain = dbToLinearGain(dbValue);
    const now = ctx.currentTime;

    if (!isParamChangeSignificant(nativeGain.gain.value, linearGain)) return;

    nativeGain.gain.setValueAtTime(linearGain, now);
  };

  const toDestination = () => {
    nativeGain.connect(ctx.destination);
    return channelFacade;
  };

  const connect = (target) => {
    const destination = extractDestinationNode(target);
    if (canConnect(destination)) {
      nativeGain.connect(destination);
    }
    return target;
  };

  const disconnect = () => {
    nativeGain.disconnect();
    return channelFacade;
  };

  const dispose = () => {
    disconnect();
  };

  // Чистый полиморфный интерфейс-фасад (Полностью совпадает с контрактом барабанов)
  const channelFacade = {
    input: nativeGain,
    output: nativeGain,
    getVolume,
    setVolume,
    toDestination,
    connect,
    disconnect,
    dispose,
  };

  return channelFacade;
};

/**
 * Декларативная фабрика создания аудио-анализатора спектра
 */
export const createAudioAnalyser = () => {
  const ctx = getNativeContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = ANALYSER_SIZE;

  analyser.toDestination = () => analyser;

  return analyser;
};
