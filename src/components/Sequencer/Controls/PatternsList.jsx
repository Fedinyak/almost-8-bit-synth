import { useDispatch, useSelector } from 'react-redux';
import {
  setCurrentPlayPatternIndex,
  setFollowModeFalse,
  setFollowModeTrue,
  setIsLoopingFalse,
  setIsLoopingTrue,
  setPendingPattern,
  setSelectedPatternIndex,
  setSequencerPlayState,
  incrementPatternCount, // Существующий экшен
  decrementPatternCountSync, // Новый синхронный экшен
  scheduleDeleteLastPattern, // Новый экшен квантованья
  setCurrentStep, // IMPORT: Added action to align absolute step on initial stop-to-start trigger
} from '../../../slices/playerSlice';
import {
  addPatternData, // Существующий экшен добавления пустых нот
  backupAndDropPatternData, // Существующий экшен удаления нот
} from '../../../slices/patternsSlice';
import {
  setEnginePosition, // ИМПОРТ: Функция для изменения физической позиции Tone.Transport
} from '../../../utility/audioEngineCore';
import { STEPS_IN_MEASURE } from '../../../constants/constants'; // IMPORT: Added steps constant for precise timeline calculation
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
  const isLooping = useSelector((state) => state.player.isLooping);

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);

  // ФУНКЦИЯ ДОБАВЛЕНИЯ ПАТТЕРНА (➕)
  const handleAddPattern = () => {
    dispatch(addPatternData()); // Мгновенно добавляем пустые структуры/ноты в конец
    dispatch(incrementPatternCount()); // Увеличиваем счетчик паттернов
  };

  // ФУНКЦИЯ УДАЛЕНИЯ ПОСЛЕДНЕГО ПАТТЕРНА (➖)
  const handleRemoveLastPattern = () => {
    if (patternCount <= 1) return; // Не удаляем единственный паттерн

    const lastPatternIndex = patternCount - 1;

    // Режим 1: СТОП — удаляем мгновенно
    if (sequencerPlayState === 'stop') {
      dispatch(backupAndDropPatternData(lastPatternIndex));
      dispatch(decrementPatternCountSync());
      return;
    }

    // Режим 3: ЛУП — квантуем на стыке текущего такта
    if (isLooping) {
      dispatch(scheduleDeleteLastPattern());
      return;
    }

    // ИСПРАВЛЕНО: Развели поведение для ПЛЕЙ (start) и ПАУЗЫ (pause)
    if (sequencerPlayState === 'pause') {
      // Если на паузе мы стояли именно на удаляемом (последнем) паттерне
      if (currentPlayPatternIndex === lastPatternIndex) {
        setEnginePosition(0); // Физически перематываем ленту Tone.js в ноль
        dispatch(setCurrentPlayPatternIndex(0)); // Переключаем играющий индекс на 1-й паттерн
      }
      // В любом случае на паузе удаляем данные из хвоста мгновенно
      dispatch(backupAndDropPatternData(lastPatternIndex));
      dispatch(decrementPatternCountSync());
      return;
    }

    // Режим 2: ПЛЕЙ (Обычная игра по порядку)
    if (sequencerPlayState === 'start') {
      // Если прямо сейчас играет последний паттерн — квантуем удаление
      if (currentPlayPatternIndex === lastPatternIndex) {
        dispatch(scheduleDeleteLastPattern());
      } else {
        // Если играет любой другой паттерн — удаляем структуру из хвоста мгновенно
        dispatch(backupAndDropPatternData(lastPatternIndex));
        dispatch(decrementPatternCountSync());
      }
    }
  };

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
      // Перед запуском движка физически перемещаем Tone.Transport на выбранный такт
      setEnginePosition(index);
      dispatch(setCurrentPlayPatternIndex(index));
      // Dispatch absolute coordinate to synchronize math scheduler on the very first frame
      dispatch(setCurrentStep(index * STEPS_IN_MEASURE));
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

  return (
    <div className="pattern-list-container">
      {/* ВШИТЫЕ СТИЛИ ДЛЯ АНИМАЦИИ МИГАНИЯ КНОПОК В МОМЕНТ КВАНТОВАНИЯ И СВЕЧЕНИЯ */}
      <style>{`
        @keyframes patternBlink {
          0% { opacity: 1; background-color: #ffaa00; }
          50% { opacity: 0.4; background-color: #ff5500; }
          100% { opacity: 1; background-color: #ffaa00; }
        }
        @keyframes loopBlink {
          0% { opacity: 1; background-color: #00aaff; }
          50% { opacity: 0.4; background-color: #0055ff; }
          100% { opacity: 1; background-color: #00aaff; }
        }
        .play-pattern-btn.is-waiting {
          animation: patternBlink 0.4s infinite ease-in-out !important;
        }
        .loop-pattern-btn.is-loop-waiting {
          animation: loopBlink 0.4s infinite ease-in-out !important;
        }
        .loop-pattern-btn.is-loop-active {
          background-color: #00aaff !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* КНОПКИ УПРАВЛЕНИЯ ДЛИНОЙ ТРЕКА СВЕРХУ */}
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

      <ul className="patten-list">
        {patternCountIndex.map((index) => {
          // Blink strictly when the play index transition is pending and loop mode is inactive
          const isWaiting =
            sequencerPlayState === 'start' &&
            pendingPatternIndex === index &&
            !isLooping;

          // Loop button blinks when loop action is pending for another target measure
          const isLoopWaiting =
            sequencerPlayState === 'start' &&
            pendingPatternIndex === index &&
            isLooping &&
            currentPlayPatternIndex !== index;

          // Loop button stays solid blue only when currently active measure matches the loop target and no other transitions are pending
          const isLoopSolid =
            isLooping &&
            currentPlayPatternIndex === index &&
            (pendingPatternIndex === null || pendingPatternIndex === index);

          return (
            <li
              key={index}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <button
                onClick={() => handlePlayPatternIndex(index)}
                className={classNames('play-pattern-btn', {
                  'is-waiting': isWaiting,
                })}
              >
                ▶
              </button>
              <button
                onClick={() => handleLoopPatternIndex(index)}
                className={classNames('loop-pattern-btn', {
                  'is-loop-waiting': isLoopWaiting,
                  'is-loop-active': isLoopSolid,
                })}
              >
                loop
              </button>
              <button
                className={[
                  selectedPatternIndex === index
                    ? 'patten-list-btn-select'
                    : '',
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
    </div>
  );
};

export default PatternList;
