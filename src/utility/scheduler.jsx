import * as Tone from "tone";
import BpmVisualizer from "../components/sequencer/BpmVisualizer";

const TimerTransport = ({ sequencerNoteGrid }) => {
  // 1. Фильтруем только те шаги, где note !== null
  const notesToPlay = sequencerNoteGrid.filter(item => item.note !== null);

  // const synth = new Tone.PolySynth(Tone.Synth, {
  const synth = new Tone.MonoSynth({
    oscillator: {
      type: "square",
    },
    envelope: {
      attack: 0.001, // Мгновенный старт
      decay: 0.1, // Быстрый спад
      sustain: 0.3, // Небольшая громкость при удержании
      release: 0.02, // Мгновенное затихание
    },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.001,
      sustain: 1, // Фильтр всегда открыт
      baseFrequency: 10000, // Высокая частота, чтобы не "мылить" звук
      octaves: 0,
    },
  }).toDestination();

  const part = new Tone.Part((time, event) => {
    // event — это ваш объект из массива выше
    synth.triggerAttackRelease(
      event.note,
      event.duration,
      time,
      event.velocity,
    );
  }, notesToPlay);

  // Настройки
  part.loop = true; // Зациклить партию
  part.loopEnd = "2m"; // Длина цикла (например, 2 такта)

  // Старт
  part.start(0); // Начать воспроизведение с 0-й секунды Транспорта
  const handleStart = () => Tone.Transport.start();
  const handleStop = () => Tone.Transport.stop();

  const handleChangeBpm100 = () => {
    Tone.Transport.bpm.value = 100;
  };

  const handleChangeBpm200 = () => {
    Tone.Transport.bpm.value = 300;
  };

  return (
    <div>
      <button onClick={handleStart}>start</button>
      <button onClick={handleStop}>stop</button>
      <button onClick={handleChangeBpm100}>100</button>
      <button onClick={handleChangeBpm200}>200</button>
      <BpmVisualizer />
    </div>
  );
};

export default TimerTransport;
