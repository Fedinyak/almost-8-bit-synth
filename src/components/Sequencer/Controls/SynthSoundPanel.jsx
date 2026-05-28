import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  toggleSynthAttackMode,
  toggleSynthBitcrusher,
} from '../../../slices/soundSettingsSlice';

export const SynthSoundPanel = ({ synthName }) => {
  const dispatch = useDispatch();

  const settings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  if (!settings) return null;

  return (
    <>
      <div>{synthName} controls:</div>

      <button onClick={() => dispatch(toggleSynthAttackMode(synthName))}>
        ATTACK: {settings.attackMode === 1 ? 'SLOW' : 'FAST'}
      </button>

      <button onClick={() => dispatch(toggleSynthBitcrusher(synthName))}>
        BITCRUSHER: {settings.bitcrusherOn ? 'ON' : 'OFF'}
      </button>
    </>
  );
};

export default SynthSoundPanel;
