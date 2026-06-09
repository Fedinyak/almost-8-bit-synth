import React from 'react';
import getNote from '../../../utility/getNote';
import SynthCell from './SynthCell';
import StepIndicator from '../StepIndicator';
import noteAndKeyMap from '../../../constants/noteAndKeyMap';

// ОПТИМИЗАЦИЯ СКОРОСТИ: Выносим статические карты нот за пределы компонента,
// чтобы они не пересоздавались в оперативной памяти при каждом рендере!
const keyboardLetter = noteAndKeyMap.keyboardLetter;
const noteMap = noteAndKeyMap.noteMap;
const octaveMap = noteAndKeyMap.noteOctaveIndexMap;

const SynthRowComponent = ({
  instrument,
  activeVisualPattern,
  octave,
  synthData,
}) => {
  const currentPatternSteps =
    synthData?.[instrument]?.patterns?.[activeVisualPattern] || [];

  return currentPatternSteps.map((_, stepIndex) => {
    // Вытаскиваем данные шага один раз, чтобы не спамить глубокими проверками во вложенном цикле клавиш
    const currentStepActiveNote =
      synthData?.[instrument]?.patterns?.[activeVisualPattern]?.[stepIndex];

    return (
      <div className="sequencer-cells-row" key={`${stepIndex}-${instrument}`}>
        <StepIndicator
          key={`${stepIndex}-step-${instrument}`}
          stepIndex={stepIndex}
        />
        {keyboardLetter.map((letter) => {
          return (
            <SynthCell
              className="sequencer-cell"
              key={`${instrument}-${letter}-${stepIndex}-${octave}`}
              instrument={instrument}
              note={getNote(letter, octave, noteMap, octaveMap)}
              sequencerActiveNote={currentStepActiveNote}
              patternIndex={activeVisualPattern}
              step={stepIndex}
            />
          );
        })}
        <br />
      </div>
    );
  });
};

// ============================================================================
// 🧱 ЖЕЛЕЗНЫЙ ЩИТ ОТ РЕРЕНДЕРОВ (React.memo со строгим кастомным сравнением)
// ============================================================================
export const SynthRow = React.memo(
  SynthRowComponent,
  (prevProps, nextProps) => {
    // Компонент ПЕРЕРИСОВЫВАЕТСЯ только в трех случаях:
    // 1. Сменилось имя инструмента
    // 2. Юзер переключил паттерн (1-2-3-4-5-6)
    // 3. Изменилась глубина октавы или физические нотные данные в Redux (synthData)
    //
    // Если бежит просто шаг секвенсора (currentStep) — props остаются прежними,
    // функция возвращает true, и React ОСТАВЛЯЕТ ВСЕ 400 ЯЧЕЕК В ПОКОЕ! Нагрузка = 0%.
    return (
      prevProps.instrument === nextProps.instrument &&
      prevProps.activeVisualPattern === nextProps.activeVisualPattern &&
      prevProps.octave === nextProps.octave &&
      prevProps.synthData === nextProps.synthData
    );
  },
);

export default SynthRow;
