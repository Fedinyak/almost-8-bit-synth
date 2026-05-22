import { useDispatch, useSelector } from 'react-redux';
import {
  setCurrentPlayPatternIndex,
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingFalse,
  // setIsLooping,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
  setSequencerPlayState,
} from '../../slices/playerSlice';
import classNames from 'classnames';

const PatternList = () => {
  const dispatch = useDispatch();

  const patternCount = useSelector((state) => state.player.patternCount);
  const pendingPatternIndex = useSelector(
    (state) => state.player.pendingPatternIndex,
  );
  const currentPlayPatternIndex = useSelector(
    (state) => state.player.currentPlayPatternIndex,
  );
  const sequencerPlayState = useSelector(
    (state) => state.player.sequencerPlayState,
  );
  const selectedPatternIndex = useSelector(
    (state) => state.player.selectedPatternIndex,
  );
  const isFollowMode = useSelector((state) => state.player.isFollowMode);

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);
  const handleSelectedPatternIndex = (index) => {
    dispatch(setSelectedPatternIndex(index));
    dispatch(setFollowModeFalse());
  };

  const handlePlayPatternIndex = (index) => {
    if (sequencerPlayState === 'start') {
      dispatch(setPendingPattern(index));
      dispatch(setIsLoopingFalse());
    }
    if (sequencerPlayState === 'stop') {
      dispatch(setCurrentPlayPatternIndex(index));
      dispatch(setIsLoopingFalse());
      dispatch(setSequencerPlayState('start'));
    }
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
