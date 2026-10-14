import { useRef } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { normalizeMathDelimiters } from "../lib/markdown";
import Question from "./Question";

const mathPlugins = {
  remarkPlugins: [remarkMath],
  rehypePlugins: [rehypeKatex],
};

function AskableP({ onAsk, children, ...rest }) {
  const textRef = useRef(null);
  return (
    <p {...rest} className="group/ask relative">
      <span ref={textRef}>{children}</span>{" "}
      <button
        type="button"
        onClick={() => onAsk(textRef.current?.innerText || "")}
        className="ml-1 inline-flex items-center gap-1 rounded font-body text-xs font-medium text-chalk-gold opacity-0 transition-opacity group-hover/ask:opacity-100 focus:opacity-100"
      >
        💬 Ask
      </button>
    </p>
  );
}

function AskableLi({ onAsk, children, ...rest }) {
  const textRef = useRef(null);
  return (
    <li {...rest} className="group/ask relative">
      <span ref={textRef}>{children}</span>{" "}
      <button
        type="button"
        onClick={() => onAsk(textRef.current?.innerText || "")}
        className="ml-1 inline-flex items-center gap-1 rounded font-body text-xs font-medium text-chalk-gold opacity-0 transition-opacity group-hover/ask:opacity-100 focus:opacity-100"
      >
        💬 Ask
      </button>
    </li>
  );
}

function splitIntoBlocks(markdown) {
  return markdown
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function interleavePositions(blockCount, questionCount) {
  if (questionCount === 0) return [];
  const positions = [];
  for (let i = 1; i <= questionCount; i++) {
    positions.push(Math.min(blockCount, Math.round((i * blockCount) / (questionCount + 1))));
  }
  return positions;
}

const HEADLINE_PATTERN = /^\*\*(.+)\*\*$/s;

export default function ExplanationView({
  explanationText,
  questions,
  priorAnswers,
  onAnswered,
  onAsk,
}) {
  const blocks = splitIntoBlocks(normalizeMathDelimiters(explanationText));
  const questionPositions = interleavePositions(blocks.length, questions.length);
  const askableComponents = {
    p: (props) => <AskableP onAsk={onAsk} {...props} />,
    li: (props) => <AskableLi onAsk={onAsk} {...props} />,
  };

  const items = [];
  blocks.forEach((block, i) => {
    const headlineMatch = i === 0 ? block.match(HEADLINE_PATTERN) : null;

    if (headlineMatch) {
      items.push(
        <div
          key={`block-${i}`}
          className="border-l-4 border-marker-coral pl-4 font-heading text-xl font-semibold leading-snug text-paper [&_p]:m-0 sm:text-2xl"
        >
          <Markdown {...mathPlugins}>{headlineMatch[1]}</Markdown>
        </div>
      );
    } else {
      items.push(
        <div key={`block-${i}`} className="prose-explanation font-body text-[16px] text-paper/85">
          <Markdown components={askableComponents} {...mathPlugins}>
            {block}
          </Markdown>
        </div>
      );
    }

    questionPositions.forEach((pos, qIndex) => {
      if (pos === i + 1) {
        const q = questions[qIndex];
        items.push(
          <Question
            key={`question-${qIndex}`}
            question={q}
            index={qIndex}
            priorAnswer={priorAnswers.find((a) => a.question_index === qIndex)}
            onAnswered={onAnswered}
          />
        );
      }
    });
  });

  return <div className="flex flex-col gap-5">{items}</div>;
}
