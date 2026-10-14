import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { askSideQuestion, listSideQuestions } from "../api";
import { normalizeMathDelimiters } from "../lib/markdown";

export default function SideQuestionDrawer({ slideId, open, onClose, context }) {
  const [thread, setThread] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setThread([]);
    listSideQuestions(slideId)
      .then(setThread)
      .catch(() => {});
  }, [slideId]);

  useEffect(() => {
    setQuestion("");
  }, [open]);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    try {
      const entry = await askSideQuestion(slideId, question.trim(), context);
      setThread((prev) => [...prev, entry]);
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-paper/10 bg-ink shadow-2xl transition-transform duration-200 ease-out sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-paper/10 px-5 py-4">
          <p className="font-heading text-lg font-semibold text-paper">Ask about this slide</p>
          <button
            onClick={onClose}
            className="font-body text-sm text-paper/60 hover:text-paper"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {thread.length === 0 && (
            <p className="font-body text-sm text-paper/50">
              Ask a tangential question about this slide — it won't interrupt the main lesson.
            </p>
          )}
          <div className="flex flex-col gap-4">
            {thread.map((entry) => (
              <div key={entry.id}>
                <p className="font-body text-sm font-medium text-paper/90">{entry.question}</p>
                <div className="prose-explanation mt-1 font-body text-sm text-paper/70">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {normalizeMathDelimiters(entry.answer)}
                  </Markdown>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleAsk} className="border-t border-paper/10 px-5 py-4">
          {context && (
            <p className="mb-2 truncate font-body text-xs text-paper/40">
              Re: "{context.slice(0, 80)}"
            </p>
          )}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a side question…"
            disabled={asking}
            rows={2}
            className="w-full rounded-md border border-paper/20 bg-transparent px-3 py-2 font-body text-sm text-paper placeholder:text-paper/40"
          />
          <button
            type="submit"
            disabled={asking}
            className="mt-2 rounded-md bg-marker-coral px-4 py-2 font-body text-sm font-medium text-paper transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {asking ? "Asking…" : "Ask"}
          </button>
          {error && <p className="mt-2 font-body text-sm text-rust">{error}</p>}
        </form>
      </div>
    </>
  );
}
