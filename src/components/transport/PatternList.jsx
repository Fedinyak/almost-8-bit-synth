import { useDispatch, useSelector } from 'react-redux';
import {
  setIsLoopingTrue,
  setIsLoopingFalse,
  setSelectedPatternIndex,
  setPendingPattern,
  setFollowModeTrue,
  setFollowModeFalse,
} from '../../store/playerSlice';
import { getPatternVisualFlags } from '../../utils/patternStatusSelectors';
import { PatternItem } from './PatternItem';
import { PatternControls } from './PatternControls';
import './patternList.css';

const PatternList = () => {
  const dispatch = useDispatch();

  const playerState = useSelector((state) => state.player);
  const {
    patternCount,
    pendingPatternIndex,
    currentPlayPatternIndex,
    sequencerPlayState,
    selectedPatternIndex,
    isFollowMode,
    isLooping,
  } = playerState;

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);

  const handlePatternAction = (type, index) => {
    switch (type) {
      case 'PLAY':
        dispatch(setPendingPattern(index));
        break;

      case 'LOOP':
        if (isLooping && selectedPatternIndex === index) {
          dispatch(setIsLoopingFalse());
          dispatch(setSelectedPatternIndex(false));
        } else {
          dispatch(setIsLoopingTrue());
          dispatch(setSelectedPatternIndex(index));
        }
        break;

      case 'SELECT':
        dispatch(setSelectedPatternIndex(index));
        dispatch(setFollowModeFalse());
        break;

      case 'TOGGLE_FOLLOW':
        if (isFollowMode) {
          dispatch(setFollowModeFalse());
        } else {
          dispatch(setFollowModeTrue());
        }
        break;

      default:
        break;
    }
  };

  return (
    <div className="pattern-list-container">
      <PatternControls />

      <ul className="patten-list">
        {patternCountIndex.map((index) => (
          <PatternItem
            key={index}
            index={index}
            // ИСПРАВЛЕНО: Передаем selectedPatternIndex вместо currentPlayPatternIndex,
            // чтобы селектор флагов поджигал мигание ожидания СТРОГО на кликнутом паттерне,
            // полностью ликвидируя ложные вспышки соседних кнопок!
            visualFlags={getPatternVisualFlags({
              index,
              sequencerPlayState,
              pendingPatternIndex,
              currentPlayPatternIndex:
                selectedPatternIndex !== false
                  ? selectedPatternIndex
                  : currentPlayPatternIndex,
              isLooping,
            })}
            isSelected={selectedPatternIndex === index}
            isFollowMode={isFollowMode}
            onAction={handlePatternAction}
          />
        ))}
      </ul>
    </div>
  );
};

export default PatternList;
