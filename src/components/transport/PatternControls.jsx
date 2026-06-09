// components/PatternList/PatternControls.js
import React from 'react';
import { useDispatch } from 'react-redux';
import { incrementPatternCount } from '../../slices/playerSlice';
import { addPatternData } from '../../slices/patternsSlice';
import { executeRemoveLastPatternRequest } from '../../utility/audioPlaybackActions';

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
