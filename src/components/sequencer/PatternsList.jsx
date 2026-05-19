import { useDispatch, useSelector } from 'react-redux';
import {
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingFalse,
  // setIsLooping,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
} from '../../slices/sequencerSlice';
import classNames from 'classnames';

const PatternList = () => {
  const dispatch = useDispatch();

  const patternCount = useSelector((state) => state.sequencer.patternCount);
  const pendingPatternIndex = useSelector(
    (state) => state.sequencer.pendingPatternIndex,
  );
  const currentPlayPatternIndex = useSelector(
    (state) => state.sequencer.currentPlayPatternIndex,
  );
  const selectedPatternIndex = useSelector(
    (state) => state.sequencer.selectedPatternIndex,
  );
  const isFollowMode = useSelector((state) => state.sequencer.isFollowMode);

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);
  const handleSelectedPatternIndex = (index) => {
    dispatch(setSelectedPatternIndex(index));
    dispatch(setFollowModeFalse());
  };

  const handlePlayPatternIndex = (index) => {
    dispatch(setPendingPattern(index));
    dispatch(setIsLoopingFalse());
  };

  const handleLoopPatternIndex = (index) => {
    dispatch(setPendingPattern(index));
    dispatch(setIsLoopingTrue());
  };
  const handleFollowModeTrue = () => {
    dispatch(setFollowModeTrue());
    dispatch(setSelectedPatternIndex(false));
  };

  // TODO: заменить индекс на ID после проверки гипотезы
  return (
    <ul className="patten-list">
      {patternCountIndex.map((index) => {
        return (
          <li key={index} style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => handlePlayPatternIndex(index)}
              className={classNames('play-pattern-btn', {
                'is-waiting': pendingPatternIndex === 1,
              })}
            >
              ▶
            </button>
            <button onClick={() => handleLoopPatternIndex(index)}>loop</button>
            <button
              className={[
                selectedPatternIndex === index ? 'patten-list-btn-select' : '',
                currentPlayPatternIndex === index
                  ? 'sequencer-cell-active'
                  : '',
              ].join(' ')}
              onClick={() => handleSelectedPatternIndex(index)}
            >
              {index + 1}
            </button>
            <button
              className={
                !isFollowMode && selectedPatternIndex === index
                  ? 'follow-mode-btn-active'
                  : 'follow-mode-btn'
              }
              onClick={handleFollowModeTrue}
            >
              fllw
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default PatternList;
