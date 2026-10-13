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
          // ИСПРАВЛЕНО: Принудительно сбрасываем выбранный индекс паттерна в Redux,
          // чтобы интерфейс переключился на системный плейхед звукового движка
          dispatch(setSelectedPatternIndex(false));
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
            visualFlags={getPatternVisualFlags({
              index,
              sequencerPlayState,
              pendingPatternIndex,
              currentPlayPatternIndex,
              isLooping,
              selectedPatternIndex,
              isFollowMode,
            })}
            // ИСПРАВЛЕНО: Если активен режим следования, выбор паттерна визуально гаснет,
            // убирая класс patten-list-btn-select с кнопки
            isSelected={!isFollowMode && selectedPatternIndex === index}
            isFollowMode={isFollowMode}
            onAction={handlePatternAction}
          />
        ))}
      </ul>
    </div>
  );
};

export default PatternList;
