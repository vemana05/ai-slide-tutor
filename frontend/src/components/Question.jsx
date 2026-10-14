import { useState } from "react";

const MAX_ATTEMPTS = 2;

export default function Question({ question, index, priorAnswer, onAnswered }) {
  const isMC = question.type === "multiple_choice";

  const [selected, setSelected] = useState(priorAnswer?.given_answer ?? null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [attempts, setAttempts] = useState(priorAnswer?.attempts ?? 0);
  const [locked, setLocked] = useState(Boolean(priorAnswer));

  const gotItRight = isMC ? selected === question.correct_answer : locked;
  const outOfTries = isMC && attempts >= MAX_ATTEMPTS && !gotItRight;
  const canRetry = isMC && locked && !gotItRight && !outOfTries;

  function submitMultipleChoice(option) {
    const newAttempts = attempts + 1;
    const correct = option === question.correct_answer;
    setSelected(option);
    setAttempts(newAttempts);
    setLocked(true);
    onAnswered(index, { givenAnswer: option, isCorrect: correct });
  }

  function retry() {
    setSelected(null);
    setLocked(false);
  }

  function submitShortAnswer(e) {
    e.preventDefault();
    if (!shortAnswer.trim()) return;
    setLocked(true);
    onAnswered(index, { givenAnswer: shortAnswer.trim(), isCorrect: true });
  }

  return (
    <div className="rounded-md border border-paper/10 bg-paper/[0.06] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-sm font-medium text-paper/90">
          {index + 1}. {question.prompt}
        </p>
        {isMC && attempts > 0 && !gotItRight && (
          <span className="shrink-0 font-body text-xs text-paper/40">
            {outOfTries ? "out of tries" : `attempt ${attempts}/${MAX_ATTEMPTS}`}
          </span>
        )}
      </div>

      {isMC ? (
        <div className="mt-3 flex flex-col gap-2">
          {question.options.map((opt) => {
            const isSelected = selected === opt;
            const showAsCorrect = (gotItRight || outOfTries) && opt === question.correct_answer;
            const showAsWrong = locked && isSelected && !gotItRight;
            return (
              <button
                key={opt}
                type="button"
                disabled={locked}
                onClick={() => submitMultipleChoice(opt)}
                className={`rounded-md border px-3 py-2 text-left font-body text-sm transition-colors ${
                  showAsCorrect
                    ? "border-sage bg-sage/15 text-paper"
                    : showAsWrong
                      ? "border-rust bg-rust/15 text-paper"
                      : locked
                        ? "border-paper/10 text-paper/40"
                        : "border-paper/20 text-paper/90 hover:border-marker-coral hover:bg-marker-coral/10"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={submitShortAnswer} className="mt-3">
          <textarea
            value={locked ? priorAnswer?.given_answer ?? shortAnswer : shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
            disabled={locked}
            rows={2}
            placeholder="Explain it back in your own words…"
            className="w-full rounded-md border border-paper/20 bg-transparent px-3 py-2 font-body text-sm text-paper placeholder:text-paper/40 disabled:opacity-70"
          />
          {!locked && (
            <button
              type="submit"
              className="mt-2 rounded-md bg-marker-coral px-3 py-1.5 font-body text-sm font-medium text-paper transition-colors hover:brightness-110"
            >
              Submit
            </button>
          )}
        </form>
      )}

      {canRetry && (
        <div className="mt-3 rounded-md border-l-2 border-rust bg-rust/10 px-3 py-2 font-body text-sm text-paper/80">
          <p className="font-medium text-paper/90">Not quite — one more try.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md bg-paper/10 px-3 py-1 font-body text-xs font-medium text-paper transition-colors hover:bg-paper/20"
          >
            Try again
          </button>
        </div>
      )}

      {((isMC && (gotItRight || outOfTries)) || (!isMC && locked)) && (
        <div
          className={`mt-3 rounded-md border-l-2 px-3 py-2 font-body text-sm ${
            gotItRight ? "border-sage bg-sage/10 text-paper/80" : "border-rust bg-rust/10 text-paper/80"
          }`}
        >
          <p className="font-medium text-paper/90">
            {!isMC
              ? "Here's a model answer:"
              : gotItRight
                ? "Correct!"
                : `Out of tries — correct answer: ${question.correct_answer}`}
          </p>
          {!isMC && <p className="mt-1">{question.correct_answer}</p>}
          <p className="mt-1">{question.feedback}</p>
        </div>
      )}
    </div>
  );
}
