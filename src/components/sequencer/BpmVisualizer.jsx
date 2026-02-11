import * as Tone from "tone";
import { useEffect, useState } from "react";

const BpmVisualizer = () => {
  const [isBeating, setIsBeating] = useState(false);

  const triggerVisualBeat = time => {
    Tone.Draw.schedule(() => {
      setIsBeating(true);
      // Выключаем подсветку через 100мс
      setTimeout(() => setIsBeating(false), 100);
    }, time);
  };

  useEffect(() => {
    // 2. Планируем цикл мигания на каждую четвертную ноту ("4n")
    const beatEvent = Tone.Transport.scheduleRepeat(time => {
      console.log("Текущий музыкальный момент (в сек):", time);
      triggerVisualBeat(time);
    }, "4n");

    return () => {
      Tone.Transport.clear(beatEvent);
    };
  }, []);

  return (
    <div
      style={{
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        margin: "0 auto 20px",
        backgroundColor: isBeating ? "#00ff00" : "#333", // Зеленый при ударе
        boxShadow: isBeating ? "0 0 20px #00ff00" : "none",
        transition: "background-color 0.05s ease-out",
      }}
    />
  );
};

export default BpmVisualizer;
