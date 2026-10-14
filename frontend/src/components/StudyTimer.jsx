import { useEffect, useRef, useState } from "react";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StudyTimer({ initialStudyMinutes = 20, initialBreakMinutes = 5 }) {
  const [studyMinutes, setStudyMinutes] = useState(initialStudyMinutes);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
  const [phase, setPhase] = useState("study");
  const [secondsLeft, setSecondsLeft] = useState(initialStudyMinutes * 60);
  const [paused, setPaused] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhase((currentPhase) => (currentPhase === "study" ? "break" : "study"));
        return 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (paused || secondsLeft !== 1) return;
    const timeout = setTimeout(() => {
      setSecondsLeft(phase === "study" ? breakMinutes * 60 : studyMinutes * 60);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [secondsLeft, phase, studyMinutes, breakMinutes, paused]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowConfig(false);
      }
    }
    if (showConfig) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConfig]);

  function cancelBreak() {
    setPhase("study");
    setSecondsLeft(studyMinutes * 60);
    setPaused(false);
  }

  function applyDurations(newStudy, newBreak) {
    setStudyMinutes(newStudy);
    setBreakMinutes(newBreak);
    setSecondsLeft(phase === "study" ? newStudy * 60 : newBreak * 60);
    setShowConfig(false);
  }

  return (
    <>
      <div ref={popoverRef} className="fixed right-4 top-4 z-40">
        <div className="flex items-center gap-1 rounded-full bg-ink/80 px-2 py-1.5 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-full px-1.5 py-0.5 font-body text-xs text-paper/80 hover:text-paper"
            aria-label={paused ? "Resume timer" : "Pause timer"}
          >
            {paused ? "▶" : "⏸"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            className="rounded-full px-1.5 py-0.5 font-body text-xs font-medium text-paper/70 hover:text-paper"
          >
            {paused ? "Paused" : phase === "study" ? "Studying" : "Break"} · {formatTime(secondsLeft)}
          </button>
        </div>

        {showConfig && (
          <DurationPopover
            studyMinutes={studyMinutes}
            breakMinutes={breakMinutes}
            onApply={applyDurations}
          />
        )}
      </div>

      {phase === "break" && !paused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/95 text-center transition-opacity duration-300">
          <div className="text-7xl">☕</div>
          <p className="font-heading text-3xl font-semibold text-paper">Break time!</p>
          <p className="font-body text-2xl text-paper/80">{formatTime(secondsLeft)}</p>
          <button
            onClick={cancelBreak}
            className="rounded-md bg-marker-coral px-5 py-2.5 font-body font-medium text-paper transition-colors hover:brightness-110"
          >
            Cancel break, keep learning
          </button>
        </div>
      )}
    </>
  );
}

function DurationPopover({ studyMinutes, breakMinutes, onApply }) {
  const [study, setStudy] = useState(studyMinutes);
  const [brk, setBrk] = useState(breakMinutes);

  return (
    <div className="mt-2 w-56 rounded-md border border-paper/10 bg-ink p-4 shadow-xl">
      <label className="block font-body text-xs text-paper/70">
        Study duration: {study} min
        <input
          type="range"
          min="5"
          max="60"
          step="5"
          value={study}
          onChange={(e) => setStudy(Number(e.target.value))}
          className="mt-1 w-full accent-marker-coral"
        />
      </label>
      <label className="mt-3 block font-body text-xs text-paper/70">
        Break duration: {brk} min
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={brk}
          onChange={(e) => setBrk(Number(e.target.value))}
          className="mt-1 w-full accent-marker-coral"
        />
      </label>
      <button
        type="button"
        onClick={() => onApply(study, brk)}
        className="mt-3 w-full rounded-md bg-marker-coral px-3 py-1.5 font-body text-sm font-medium text-paper hover:brightness-110"
      >
        Apply
      </button>
    </div>
  );
}
