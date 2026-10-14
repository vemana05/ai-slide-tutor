import { useState } from "react";

const KNOWLEDGE_LEVELS = [
  { value: "basic", label: "Basic" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CONTENT_DEPTHS = [
  { value: "surface", label: "Surface-level" },
  { value: "balanced", label: "Balanced" },
  { value: "in_depth", label: "In-depth" },
];

function OptionGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-marker-coral text-paper"
              : "bg-ink/[0.04] text-ink/70 hover:bg-ink/[0.08]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingForm({ initial, onSubmit }) {
  const [knowledgeLevel, setKnowledgeLevel] = useState(initial?.knowledge_level || "basic");
  const [contentDepth, setContentDepth] = useState(initial?.content_depth || "balanced");
  const [timerEnabled, setTimerEnabled] = useState(initial?.timer_enabled || false);
  const [strictMode, setStrictMode] = useState(initial?.strict_mode || false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ knowledgeLevel, contentDepth, timerEnabled, strictMode });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-paper p-8 text-ink shadow-lg">
      <h2 className="font-heading text-2xl font-semibold">Before we start</h2>
      <p className="mt-1 font-body text-sm text-ink/60">
        You can change either of these any time during the lesson.
      </p>

      <div className="mt-6">
        <p className="font-body text-sm font-medium text-ink/80">What's your knowledge level for this material?</p>
        <div className="mt-2">
          <OptionGroup options={KNOWLEDGE_LEVELS} value={knowledgeLevel} onChange={setKnowledgeLevel} />
        </div>
      </div>

      <div className="mt-6">
        <p className="font-body text-sm font-medium text-ink/80">How deep do you want to go?</p>
        <div className="mt-2">
          <OptionGroup options={CONTENT_DEPTHS} value={contentDepth} onChange={setContentDepth} />
        </div>
      </div>

      <label className="mt-6 flex items-center gap-2 font-body text-sm text-ink/80">
        <input
          type="checkbox"
          checked={timerEnabled}
          onChange={(e) => setTimerEnabled(e.target.checked)}
          className="h-4 w-4"
        />
        Use a study timer (20 min study / 5 min break)
      </label>

      <label className="mt-3 flex items-center gap-2 font-body text-sm text-ink/80">
        <input
          type="checkbox"
          checked={strictMode}
          onChange={(e) => setStrictMode(e.target.checked)}
          className="h-4 w-4"
        />
        Strict mode — answer comprehension questions before moving on
      </label>

      <button
        type="submit"
        className="mt-8 rounded-md bg-marker-coral px-5 py-2.5 font-body font-medium text-paper transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marker-coral"
      >
        Start learning
      </button>
    </form>
  );
}
