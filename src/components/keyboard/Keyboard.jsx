import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// import { decrement, increment } from "../../slices/counterSlice";
import {
  decreaseOctave,
  increaseOctave,
  setActiveNote,
} from '../../slices/noteSlice.js';
// import playSound from "../../utility/playSound";
import getNote from '../../utility/getNote';
import KeyboardKey from './KeyboardKey';
import noteAndKeyMap from '../../constants/noteAndKeyMap.js';
import { synthEnginesRegistry } from '../../utility/visualizerState';

const OctaveSelector = () => {
  const dispatch = useDispatch();
  return (
    <div>
      <button onClick={() => dispatch(decreaseOctave())}>- octave</button>
      <button onClick={() => dispatch(increaseOctave())}>+ octave</button>
    </div>
  );
};

const Keyboard = ({ activeInstrument }) => {
  // const count = useSelector(state => state.counter.value);
  // const keyboardLetter = useSelector(state => state.note.keyboardLetter);

  const octave = useSelector((state) => state.note.octave);
  const activeNote = useSelector((state) => state.note.activeNote);
  // const noteMap = useSelector(state => state.note.noteMap);
  const keyboardLetter = noteAndKeyMap.keyboardLetter;
  const noteMap = noteAndKeyMap.noteMap;
  const octaveMap = noteAndKeyMap.noteOctaveIndexMap;
  // const octaveMap = useSelector(state => state.note.noteOctaveIndexMap);

  const tabs = useSelector((state) => state.player.tabs);
  const activeTabIndex = useSelector((state) => state.player.activeTabIndex);

  const resolvedInstrumentName = activeInstrument || tabs[activeTabIndex];

  // СБЕРЕГАТЕЛЬНЫЙ РЕФ-ШЛЮЗ: Хранит имя свежего активного синта, защищая обработчик событий от устаревания данных
  const activeInstrumentRef = useRef(resolvedInstrumentName);
  const octaveRef = useRef(octave);

  const dispatch = useDispatch();

  // Синхронизируем рефы при каждом изменении стейта
  useEffect(() => {
    activeInstrumentRef.current = resolvedInstrumentName;
  }, [resolvedInstrumentName]);

  useEffect(() => {
    octaveRef.current = octave;
  }, [octave]);

  const handleKeyboardKeyDown = (event) => {
    if (keyboardLetter.join().includes(event.key)) {
      console.log(event.key, octaveRef.current, 'event.key, octave');
      const note = getNote(event.key, octaveRef.current, noteMap, octaveMap);

      // ДИСПАТЧИМ ДЛЯ UI: Обновляем стейт чисто для визуальной подсветки клавиш на экране
      dispatch(setActiveNote(note));

      // ИГРАЕМ В ЖЕЛЕЗЕ МГНОВЕННО: Извлекаем звук строго из того синта, который открыт в эту миллисекунду
      const currentInstrument = activeInstrumentRef.current;
      if (currentInstrument && currentInstrument !== 'drums') {
        const synthInstance = synthEnginesRegistry.current?.[currentInstrument];
        if (synthInstance?.instrument) {
          try {
            synthInstance.instrument.triggerAttackRelease(note, '8n');
          } catch (e) {}
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyboardKeyDown);
    };
  }, []); // Пустой массив гарантирует стабильный единый слушатель без утечек памяти

  return (
    <section>
      <OctaveSelector />
      <div className="keyboard">
        {keyboardLetter.map((letter, i) => (
          <KeyboardKey
            keyboardLetter={letter}
            octave={octave}
            activeNote={activeNote}
            key={i}
          />
        ))}
      </div>
    </section>
  );
};

export default Keyboard;
