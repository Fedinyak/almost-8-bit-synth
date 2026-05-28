import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  toggleSynthAttackMode,
  toggleSynthBitcrusher,
} from '../../../slices/soundSettingsSlice'; // проверь путь до слайса

export const SynthSoundPanel = ({ synthName }) => {
  const dispatch = useDispatch();

  // Компонент сам динамически забирает из стейта настройки именно для своего синта
  const settings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  // Защита на случай, если стейт еще грузится или имя синта передано неверно
  if (!settings) return null;

  // Человекочитаемое имя для вывода на панель (например, "synth1" -> "SYNTH 1")
  const displayTitle = synthName.toUpperCase().replace(/(\d+)/, ' $1');

  return (
    <div
      style={{
        padding: '10px',
        background: '#1a1a1a',
        border: '1px solid #333',
        marginBottom: '8px',
        borderRadius: '4px',
        display: 'inline-block',
        fontFamily: 'monospace', // 8-битная эстетика
      }}
    >
      <div
        style={{
          color: '#888',
          fontSize: '11px',
          marginBottom: '6px',
          fontWeight: 'bold',
        }}
      >
        {displayTitle} CONTROLS:
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Кнопка управления Атакой (ADSR) */}
        <button
          onClick={() => dispatch(toggleSynthAttackMode(synthName))}
          style={{
            padding: '6px 12px',
            background: settings.attackMode === 1 ? '#00ff00' : '#333',
            color: settings.attackMode === 1 ? '#000' : '#fff',
            border: '1px solid #555',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        >
          ATTACK: {settings.attackMode === 1 ? 'SLOW' : 'FAST'}
        </button>

        {/* Кнопка управления Биткрашером (FX) */}
        <button
          onClick={() => dispatch(toggleSynthBitcrusher(synthName))}
          style={{
            padding: '6px 12px',
            background: settings.bitcrusherOn ? '#00ff00' : '#333',
            color: settings.bitcrusherOn ? '#000' : '#fff',
            border: '1px solid #555',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        >
          BITCRUSHER: {settings.bitcrusherOn ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};

export default SynthSoundPanel;
