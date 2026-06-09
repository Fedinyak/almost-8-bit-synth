import React from 'react';
import classNames from 'classnames';

export const PatternItem = ({
  index,
  visualFlags,
  isSelected,
  isFollowMode,
  onAction,
}) => {
  const { isPlayWaiting, isLoopWaiting, isLoopActive, isActivePlayback } =
    visualFlags;

  return (
    <li style={{ display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={() => onAction('PLAY', index)}
        className={classNames('play-pattern-btn', {
          'is-waiting': isPlayWaiting,
        })}
      >
        ▶
      </button>

      <button
        onClick={() => onAction('LOOP', index)}
        className={classNames('loop-pattern-btn', {
          'is-loop-waiting': isLoopWaiting,
          'is-loop-active': isLoopActive,
        })}
      >
        loop
      </button>

      <button
        className={[
          isSelected ? 'patten-list-btn-select' : '',
          isActivePlayback ? 'sequencer-cell-active' : '',
        ].join(' ')}
        onClick={() => onAction('SELECT', index)}
      >
        {index + 1}
      </button>

      <button
        className={
          !isFollowMode && isSelected
            ? 'follow-mode-btn-active'
            : 'follow-mode-btn'
        }
        onClick={() => onAction('TOGGLE_FOLLOW', index)}
      >
        fllw
      </button>
    </li>
  );
};
