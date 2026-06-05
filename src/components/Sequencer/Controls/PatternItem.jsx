import React from 'react';
import classNames from 'classnames';

export const PatternItem = ({
  index,
  visualFlags,
  isSelected,
  isFollowMode,
  onPlayClick,
  onLoopClick,
  onSelectClick,
  onFollowClick,
}) => {
  const { isPlayWaiting, isLoopWaiting, isLoopActive, isActivePlayback } =
    visualFlags;

  return (
    <li style={{ display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={() => onPlayClick(index)}
        className={classNames('play-pattern-btn', {
          'is-waiting': isPlayWaiting,
        })}
      >
        ▶
      </button>

      <button
        onClick={() => onLoopClick(index)}
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
        onClick={() => onSelectClick(index)}
      >
        {index + 1}
      </button>

      <button
        className={
          !isFollowMode && isSelected
            ? 'follow-mode-btn-active'
            : 'follow-mode-btn'
        }
        onClick={onFollowClick}
      >
        fllw
      </button>
    </li>
  );
};
