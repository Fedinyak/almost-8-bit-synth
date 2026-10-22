import { dbToLinearGain } from './drumHardware';
import { synthesisMembraneDrum, synthesisNoiseDrum } from './drumSynthesis';

const SYNTH_TYPE_MEMBRANE = 'MembraneSynth';

export const hasDisposeMethod = (container) =>
  container && typeof container.dispose === 'function';

export const updateHardwareDrumVolume = (
  { outputNode, ctx },
  decibelsValue,
) => {
  if (outputNode && ctx) {
    outputNode.gain.setValueAtTime(
      dbToLinearGain(decibelsValue),
      ctx.currentTime,
    );
  }
};

export const executeHardwareDisconnect = (state) => {
  if (state.outputNode && state.isConnectedToHardware) {
    try {
      state.outputNode.disconnect();
      state.isConnectedToHardware = false;
    } catch (e) {}
  }
};

export const dispatchDrumSynthesis = (
  typeString,
  ctx,
  drumGain,
  drumName,
  ctxTime,
  totalDrumDuration,
) => {
  const isMembrane = typeString === SYNTH_TYPE_MEMBRANE;
  if (isMembrane) {
    synthesisMembraneDrum(ctx, drumGain, ctxTime, totalDrumDuration);
  } else {
    synthesisNoiseDrum(ctx, drumGain, drumName, ctxTime, totalDrumDuration);
  }
};
