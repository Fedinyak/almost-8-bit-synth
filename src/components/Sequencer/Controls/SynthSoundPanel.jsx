import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import SoundParamGroup from './SoundParamGroup';
import { SOUND_PARAM_GROUPS } from '../../../constants/soundParamsConfig';
import { WaveformMirror } from '../Synths/WaveformMirror'; // Твой импорт

export const SynthSoundPanel = ({ synthName }) => {
  const synthSettings = useSelector(
    (state) => state.soundSettings?.synths?.[synthName],
  );

  // 🆕 Локальный стейт для слежения за фокусом группы ручек
  const [activeGroup, setActiveGroup] = useState('envelope');

  if (!synthSettings) return null;

  return (
    <div
      style={{ padding: '8px', border: '1px solid #444', marginBottom: '10px' }}
      // Позволяет ловить всплытие событий изменения (onChange) от любого слайдера в этой панели
      onChange={(e) => {
        // Ищем, к какой группе принадлежит покрученная ручка через родительский div
        const groupDiv = e.target.closest('.sound-param-group-container');
        if (groupDiv?.dataset?.group) {
          setActiveGroup(groupDiv.dataset.group);
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          // justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div>
          <strong>{synthName.toUpperCase()} CONTROLS:</strong>
        </div>

        {/* 🆕 Теперь цвет меняется динамически на основе activeGroup! */}
        <WaveformMirror
          synthName={synthName}
          activeParamGroup={activeGroup}
          instrumentSettings={synthSettings}
        />
      </div>

      {SOUND_PARAM_GROUPS.map((group) => (
        // Упаковываем группу в div с дата-атрибутом, чтобы ловить его при onChange
        <div
          key={group.key}
          className="sound-param-group-container"
          data-group={group.key}
        >
          <SoundParamGroup
            groupKey={group.key}
            title={group.label}
            className={`group-${group.key}`}
            synthName={synthName}
            instrumentSettings={synthSettings}
          />
        </div>
      ))}
    </div>
  );
};

export default SynthSoundPanel;
