// components/PatternList/PatternControls.js
import React from 'react';
import { useDispatch } from 'react-redux';
import { incrementPatternCount } from '../../store/playerSlice';
import { addPatternData } from '../../store/patternsSlice';
import { executeRemoveLastPatternRequest } from '../../audio/playback/audioPlaybackActions';

export const PatternControls = () => {
  const dispatch = useDispatch();

  const handleAddPattern = () => {
    dispatch(addPatternData());
    dispatch(incrementPatternCount());
  };

  const handleRemoveLastPattern = () => {
    dispatch(executeRemoveLastPatternRequest());
  };

  return (
    <div
      className="pattern-controls"
      style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
    >
      <button onClick={handleAddPattern} className="add-pattern-global-btn">
        + Add pattern
      </button>
      <button
        onClick={handleRemoveLastPattern}
        className="remove-pattern-global-btn"
      >
        - Delete pattern
      </button>
    </div>
  );
};
