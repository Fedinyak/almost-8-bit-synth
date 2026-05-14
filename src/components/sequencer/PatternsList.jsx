import { useSelector } from 'react-redux';

const PatternList = () => {
  const patternCount = useSelector((state) => state.sequencer.patternCount);

  const patternCountIndex = Array.from({ length: patternCount }, (_, i) => i);
  console.log(patternCountIndex, patternCount, 'patternCountIndex');

  return (
    <ul>
      {patternCountIndex.map((index) => {
        return (
          <li key={index}>
            <button>{index}</button>
          </li>
        );
      })}
    </ul>
  );
};

export default PatternList;
