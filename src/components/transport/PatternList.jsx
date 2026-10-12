import { useDispatch, useSelector } from 'react-redux';
import {
  setIsLoopingTrue,
  setIsLoopingFalse,
  setSelectedPatternIndex,
  setPendingPattern,
  setFollowModeTrue,
  setFollowModeFalse,
} from '../../store/playerSlice'; // Импортируем чистые экшены управления стейтом
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

  // 🆕 ВЫПРЕЙМЛЕННЫЙ РОУТЕР КЛИКОВ: Контролирует поведение кнопок грувбокса на 100% стабильно
  const handlePatternAction = (type, index) => {
    switch (type) {
      case 'PLAY':
        // Кнопка Старт/Прыжок: выставляем отложенный целевой паттерн для квантования на 15-м шаге
        dispatch(setPendingPattern(index));
        break;

      case 'LOOP':
        // Кнопка Луп паттерна: если луп уже горел на этом же такте — полностью выключаем его
        if (isLooping && selectedPatternIndex === index) {
          dispatch(setIsLoopingFalse());
          dispatch(setSelectedPatternIndex(false));
        } else {
          // Иначе — жестко включаем мастер-петлю и привязываем её к индексу кликнутого паттерна
          dispatch(setIsLoopingTrue());
          dispatch(setSelectedPatternIndex(index));
        }
        break;

      case 'SELECT':
        // Кнопка выбора экрана: переключаем видимый паттерн и отжимаем режим авто-следования,
        // чтобы пользователь мог спокойно редактировать ноты, пока музыка играет дальше!
        dispatch(setSelectedPatternIndex(index));
        dispatch(setFollowModeFalse());
        break;

      case 'TOGGLE_FOLLOW':
        // Кнопка Follow Mode: переключает режим автоматического прыжка экрана за бегущим звуком
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
            visualFlags={getPatternVisualFlags({
              index,
              sequencerPlayState,
              pendingPatternIndex,
              currentPlayPatternIndex,
              isLooping,
            })}
            isSelected={selectedPatternIndex === index}
            isFollowMode={isFollowMode}
            // Перенаправляем события на наш выпрямленный локальный обработчик кликов
            onAction={handlePatternAction}
          />
        ))}
      </ul>
    </div>
  );
};

export default PatternList;
