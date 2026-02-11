import React, { useLayoutEffect, useRef, useState } from "react";
import * as Tone from "tone";
import * as Nexus from "nexusui";

const GRIDS = {
  drums: Array.from({ length: 16 }, () => Array(4).fill(0)),
  notes1: Array.from({ length: 16 }, () => Array(8).fill(0)),
  notes2: Array.from({ length: 16 }, () => Array(8).fill(0)),
};

const ProStudio = () => {
  const [activeTab, setActiveTab] = useState("drums");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [bpm, setBpm] = useState(120);

  const refs = {
    drums: useRef(null),
    notes1: useRef(null),
    notes2: useRef(null),
    osc: useRef(null),
    bpm: useRef(null),
    volDrums: useRef(null),
    volSynth: useRef(null),
    delay: useRef(null),
  };

  const engines = useRef({ inst: {}, step: 0, recorder: null, chunks: [] });

  useLayoutEffect(() => {
    // 1. Интерфейс (NexusUI)
    const dM = new Nexus.Sequencer(refs.drums.current, {
      size: [240, 480],
      rows: 16,
      columns: 4,
    });
    const n1M = new Nexus.Sequencer(refs.notes1.current, {
      size: [400, 480],
      rows: 16,
      columns: 8,
    });
    const n2M = new Nexus.Sequencer(refs.notes2.current, {
      size: [400, 480],
      rows: 16,
      columns: 8,
    });
    const osc = new Nexus.Oscilloscope(refs.osc.current, { size: [150, 50] });
    const bpmS = new Nexus.Slider(refs.bpm.current, {
      size: [120, 20],
      min: 60,
      max: 200,
      value: 120,
    });

    // Микшеры и эффекты
    const vD = new Nexus.Dial(refs.volDrums.current, {
      size: [40, 40],
      value: 0.8,
    });
    const vS = new Nexus.Dial(refs.volSynth.current, {
      size: [40, 40],
      value: 0.7,
    });
    const dly = new Nexus.Dial(refs.delay.current, {
      size: [40, 40],
      value: 0.3,
    });

    dM.colorize("accent", "#ff4757");
    n1M.colorize("accent", "#2ed573");
    n2M.colorize("accent", "#3498db");

    // 2. Звуковой тракт и Эффекты
    const master = Tone.Destination;
    const reverb = new Tone.Reverb(1.5).toDestination();
    const delay = new Tone.FeedbackDelay("8n", 0.4).connect(reverb);
    osc.connect(master);

    const drumBus = new Tone.Volume(0).connect(reverb);
    const synthBus = new Tone.Volume(0).connect(delay);

    engines.current.inst = {
      kick: new Tone.MembraneSynth().connect(drumBus),
      snare: new Tone.NoiseSynth({ envelope: { decay: 0.1 } }).connect(drumBus),
      hat: new Tone.MetalSynth({ envelope: { decay: 0.05 } }).connect(drumBus),
      synth1: new Tone.PolySynth(Tone.Synth).connect(synthBus),
      synth2: new Tone.PolySynth(Tone.DuoSynth).connect(synthBus),
      drumBus,
      synthBus,
      delay,
      reverb,
    };

    // События интерфейса
    dM.on("change", v => (GRIDS.drums[v.row][v.column] = v.state ? 1 : 0));
    n1M.on("change", v => (GRIDS.notes1[v.row][v.column] = v.state ? 1 : 0));
    n2M.on("change", v => (GRIDS.notes2[v.row][v.column] = v.state ? 1 : 0));
    bpmS.on("change", v => {
      Tone.Transport.bpm.value = v;
      setBpm(Math.round(v));
    });
    vD.on("change", v => drumBus.volume.rampTo(Tone.gainToDb(v), 0.1));
    vS.on("change", v => synthBus.volume.rampTo(Tone.gainToDb(v), 0.1));
    dly.on("change", v => delay.feedback.rampTo(v * 0.8, 0.1));

    // 3. Цикл
    const scale1 = ["C4", "B3", "A3", "G3", "F3", "E3", "D3", "C3"];
    const scale2 = ["C3", "Bb2", "Ab2", "G2", "F2", "Eb2", "D2", "C2"];

    const loopId = Tone.Transport.scheduleRepeat(time => {
      const s = engines.current.step;
      if (GRIDS.drums[s][0])
        engines.current.inst.kick.triggerAttackRelease("C1", "8n", time);
      if (GRIDS.drums[s][1])
        engines.current.inst.snare.triggerAttackRelease("16n", time);
      if (GRIDS.drums[s][2])
        engines.current.inst.hat.triggerAttackRelease("32n", time, 0.3);

      const n1 = [];
      for (let i = 0; i < 8; i++) if (GRIDS.notes1[s][i]) n1.push(scale1[i]);
      if (n1.length)
        engines.current.inst.synth1.triggerAttackRelease(n1, "16n", time);

      const n2 = [];
      for (let i = 0; i < 8; i++) if (GRIDS.notes2[s][i]) n2.push(scale2[i]);
      if (n2.length)
        engines.current.inst.synth2.triggerAttackRelease(n2, "16n", time);

      Tone.Draw.schedule(() => setActiveStep(s), time);
      engines.current.step = (s + 1) % 16;
    }, "16n");

    return () => {
      Tone.Transport.clear(loopId);
      [dM, n1M, n2M, osc, bpmS, vD, vS, dly].forEach(i => i.destroy());
    };
  }, []);

  const handleRecord = async () => {
    if (!isRecording) {
      const dest = Tone.context.createMediaStreamDestination();
      Tone.Destination.connect(dest);
      engines.current.recorder = new MediaRecorder(dest.stream);
      engines.current.chunks = [];
      engines.current.recorder.ondataavailable = e =>
        engines.current.chunks.push(e.data);
      engines.current.recorder.onstop = () => {
        const blob = new Blob(engines.current.chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pro_studio_mix.webm";
        a.click();
      };
      await Tone.start();
      engines.current.step = 0;
      Tone.Transport.seconds = 0;
      Tone.Transport.start();
      engines.current.recorder.start();
      setIsPlaying(true);
      setIsRecording(true);
    } else {
      engines.current.recorder.stop();
      setIsRecording(false);
      Tone.Transport.stop();
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    await Tone.start();
    if (Tone.Transport.state === "started") {
      Tone.Transport.stop();
      setIsPlaying(false);
    } else {
      engines.current.step = 0;
      Tone.Transport.seconds = 0;
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#0a0a0a",
        color: "#fff",
        borderRadius: "15px",
        fontFamily: "monospace",
      }}
    >
      {/* MIXER & MASTER */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          background: "#111",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div ref={refs.volDrums} />
          <span style={{ fontSize: "9px", color: "#ff4757" }}>DRUMS VOL</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div ref={refs.volSynth} />
          <span style={{ fontSize: "9px", color: "#2ed573" }}>SYNTH VOL</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div ref={refs.delay} />
          <span style={{ fontSize: "9px", color: "#00fbff" }}>ECHO</span>
        </div>
        <div style={{ flexGrow: 1, textAlign: "center" }}>
          <div ref={refs.bpm} />
          <span style={{ fontSize: "11px" }}>{bpm} BPM</span>
        </div>
        <div ref={refs.osc} />
        <button
          onClick={togglePlay}
          style={{
            padding: "10px 20px",
            background: isPlaying ? "#444" : "#2ed573",
            border: "none",
            color: "#fff",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>
        <button
          onClick={handleRecord}
          style={{
            padding: "10px 20px",
            background: isRecording ? "#ff4757" : "#ff9f43",
            border: "none",
            color: "#fff",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {isRecording ? "🔴 REC" : "REC"}
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "5px" }}>
        <button
          onClick={() => setActiveTab("drums")}
          style={{
            ...tB,
            background: activeTab === "drums" ? "#ff4757" : "#222",
          }}
        >
          DRUMS
        </button>
        <button
          onClick={() => setActiveTab("notes1")}
          style={{
            ...tB,
            background: activeTab === "notes1" ? "#2ed573" : "#222",
          }}
        >
          LEAD
        </button>
        <button
          onClick={() => setActiveTab("notes2")}
          style={{
            ...tB,
            background: activeTab === "notes2" ? "#3498db" : "#222",
          }}
        >
          BASS
        </button>
      </div>

      <div
        style={{
          position: "relative",
          background: "#111",
          padding: "20px",
          borderRadius: "0 10px 10px 10px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: activeTab === "drums" ? "block" : "none",
            position: "relative",
          }}
        >
          <div style={lbl}>
            <span>K</span>
            <span>S</span>
            <span>H</span>
            <span>T</span>
          </div>
          <div ref={refs.drums} />
          <div
            style={{
              ...stpr,
              top: activeStep * 30 + 15,
              width: 240,
              display: isPlaying ? "block" : "none",
            }}
          />
        </div>
        <div
          style={{
            display: activeTab === "notes1" ? "block" : "none",
            position: "relative",
          }}
        >
          <div style={lbl}>
            {["C4", "B3", "A3", "G3", "F3", "E3", "D3", "C3"].map(n => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div ref={refs.notes1} />
          <div
            style={{
              ...stpr,
              top: activeStep * 30 + 15,
              width: 400,
              display: isPlaying ? "block" : "none",
            }}
          />
        </div>
        <div
          style={{
            display: activeTab === "notes2" ? "block" : "none",
            position: "relative",
          }}
        >
          <div style={lbl}>
            {["C3", "Bb2", "Ab2", "G2", "F2", "Eb2", "D2", "C2"].map(n => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div ref={refs.notes2} />
          <div
            style={{
              ...stpr,
              top: activeStep * 30 + 15,
              width: 400,
              display: isPlaying ? "block" : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};

const tB = {
  padding: "10px 20px",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  borderRadius: "5px 5px 0 0",
};
const lbl = {
  display: "flex",
  justifyContent: "space-around",
  fontSize: "9px",
  marginBottom: "5px",
  color: "#555",
};
const stpr = {
  position: "absolute",
  left: 0,
  height: "30px",
  border: "2px solid #fff",
  boxSizing: "border-box",
  pointerEvents: "none",
  zIndex: 10,
};

export default ProStudio;
