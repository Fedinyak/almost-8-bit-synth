/**
 * Утилита перевода строкового обозначения ноты ("C4", "D#3") в физическую частоту (Герцы)
 */
export const noteToFrequency = (noteStr) => {
  const DEFAULT_FALLBACK_FREQUENCY_HZ = 440; // Стандартная частота ноты Ля первой октавы
  const BASE_MIDI_NOTE_CONVERSION = 12; // Количество полутонов в одной октаве
  const MIDI_OCTAVE_OFFSET = 1; // Корректирующий сдвиг октавы для MIDI-стандарта
  const MIDI_REFERENCE_NOTE = 69; // Номер MIDI-ноты Ля первой октавы (440 Гц)

  if (!noteStr || typeof noteStr !== 'string')
    return DEFAULT_FALLBACK_FREQUENCY_HZ;

  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];

  // Проверяем наличие знака диеза на второй позиции строки ноты
  const hasSharp = noteStr[1] === '#';

  const pitch = hasSharp ? noteStr.slice(0, 2) : noteStr[0];
  const octaveStr = hasSharp ? noteStr.slice(2) : noteStr.slice(1);

  const semitoneOffset = notes.indexOf(pitch);
  const octave = parseInt(octaveStr, 10);

  if (semitoneOffset === -1 || isNaN(octave))
    return DEFAULT_FALLBACK_FREQUENCY_HZ;

  const midiNumber =
    (octave + MIDI_OCTAVE_OFFSET) * BASE_MIDI_NOTE_CONVERSION + semitoneOffset;
  return (
    DEFAULT_FALLBACK_FREQUENCY_HZ *
    Math.pow(2, (midiNumber - MIDI_REFERENCE_NOTE) / BASE_MIDI_NOTE_CONVERSION)
  );
};
