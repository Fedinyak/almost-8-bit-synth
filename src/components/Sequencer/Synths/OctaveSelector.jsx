import { decreaseOctave, increaseOctave } from '../../../store/noteSlice';
import { useDispatch } from 'react-redux';

const OctaveSelector = () => {
  const dispatch = useDispatch();
  return (
    <div>
      <button onClick={() => dispatch(decreaseOctave())}>- octave</button>
      <button onClick={() => dispatch(increaseOctave())}>+ octave</button>
    </div>
  );
};

export default OctaveSelector;
