import { useDispatch, useSelector } from 'react-redux';
import { toggleDrumStep } from '../../../slices/patternsSlice';
import cn from 'classnames';

const DrumCell = ({ drumName, stepIndex, activeVisualPattern }) => {
  const dispatch = useDispatch();

  const isStepActive = useSelector(
    (state) =>
      state.patterns.drumsData.patterns[activeVisualPattern][drumName][
        stepIndex
      ],
  );

  const cellStyle = cn('sequencer-cell', {
    'sequencer-cell-active': isStepActive !== 0,
  });

  return (
    <button
      className={cellStyle}
      onClick={() =>
        dispatch(
          toggleDrumStep({
            drumName,
            stepIndex,
            patternIndex: activeVisualPattern,
          }),
        )
      }
    >
      {drumName[0]}
    </button>
  );
};

export default DrumCell;
