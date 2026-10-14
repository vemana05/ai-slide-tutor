import json

from groq import Groq

from app.config import settings

_client: Groq | None = None

MODEL = "openai/gpt-oss-120b"

KNOWLEDGE_LEVEL_INSTRUCTIONS = {
    "basic": (
        "Basic level: use analogies, avoid jargon (or define it immediately when unavoidable), "
        "slower pacing, more examples."
    ),
    "intermediate": (
        "Intermediate level: assume foundational knowledge, use moderate jargon, connect this "
        "concept to related ideas."
    ),
    "advanced": (
        "Advanced level: be dense and technical, assume prerequisite fluency, focus on nuance "
        "and edge cases."
    ),
}

CONTENT_DEPTH_INSTRUCTIONS = {
    "surface": (
        "Surface-level depth: hit only the main point of the slide, in 2-4 sentences max."
    ),
    "balanced": (
        "Balanced depth: cover the main point plus the one or two supporting details that "
        "actually matter. Cap around 150-200 words — shorter if the slide doesn't need more."
    ),
    "in_depth": (
        "In-depth: still concise, but also touch one relevant edge case or common "
        "misconception if there's a real one worth mentioning. Cap around 300-350 words — "
        "shorter if the slide doesn't need more. Do not pad to reach this cap."
    ),
}

MAX_TOKENS_BY_DEPTH = {
    "surface": 250,
    "balanced": 450,
    "in_depth": 750,
}


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _prior_context_block(prior_slides: list[dict], max_chars: int = 3000) -> str:
    if not prior_slides:
        return "(This is the first slide.)"

    lines = []
    for s in prior_slides:
        if s["raw_text"]:
            lines.append(f"Slide {s['index'] + 1}: {s['raw_text']}")

    text = "\n".join(lines)
    if len(text) > max_chars:
        text = "…\n" + text[-max_chars:]
    return text or "(No extracted text on prior slides.)"


def generate_explanation(
    slide: dict,
    prior_slides: list[dict],
    knowledge_level: str,
    content_depth: str,
) -> str:
    system_prompt = (
        "You are a sharp, engaging personal tutor walking a student through a slideshow, one "
        "slide at a time — think of how a great human tutor talks in conversation, not how a "
        "textbook reads. Explain the current slide clearly, building on what came before. Do "
        "not repeat the slide's raw text back verbatim — teach it. Do not mention that you are "
        "an AI or that this is a prompt.\n\n"
        "Be ruthlessly concise. The word-count caps below are ceilings, not goals — stop the "
        "instant you've actually taught the point. Never pad, never restate the same idea in "
        "different words, never add filler transitions like 'let's dive in' or 'in conclusion'.\n\n"
        "Match effort to the slide's actual content:\n"
        "- If the slide is substantive (a concept, method, formula, example), teach it properly "
        "at the requested depth.\n"
        "- If the slide is low-content (title slide, acknowledgments, agenda, section divider, "
        "references, \"questions?\"), do NOT manufacture an explanation just to fill space. Say "
        "what it is in one short sentence and stop — this applies regardless of depth.\n\n"
        "Format as Markdown, and vary the structure so it doesn't read as one uniform block:\n"
        "- Open with one short, punchy bolded line — the headline, not a topic sentence.\n"
        "- Use short paragraphs (2-3 sentences max).\n"
        "- Use a bullet or numbered list whenever you're enumerating multiple related facts, "
        "steps, or examples — don't write a list as prose.\n"
        "- If there's a formula, put it on its own line as a block equation.\n"
        "- Bold key terms the first time you introduce them (sparingly — bolding everything "
        "bolds nothing).\n"
        "- Use a fenced code block for any code.\n"
        "- Write math with LaTeX delimiters: $...$ for inline math, $$...$$ on its own line for "
        "a standalone equation. Never use \\[ \\] or \\( \\)."
    )

    user_prompt = f"""Prior slides for context:
{_prior_context_block(prior_slides)}

Current slide ({slide['index'] + 1}):
{slide['raw_text'] or '(No extracted text — describe based on any speaker notes.)'}

Speaker notes for current slide: {slide['speaker_notes'] or '(none)'}

Teaching instructions:
- {KNOWLEDGE_LEVEL_INSTRUCTIONS[knowledge_level]}
- {CONTENT_DEPTH_INSTRUCTIONS[content_depth]}

Write the explanation for the student now."""

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=MAX_TOKENS_BY_DEPTH[content_depth],
        temperature=0.6,
    )
    return response.choices[0].message.content.strip()


MAX_QUESTIONS_BY_DEPTH = {
    "surface": 1,
    "balanced": 2,
    "in_depth": 3,
}


def generate_questions(
    slide: dict,
    explanation_text: str,
    knowledge_level: str,
    content_depth: str,
) -> list[dict]:
    max_count = MAX_QUESTIONS_BY_DEPTH[content_depth]

    system_prompt = (
        "You write comprehension-check questions for a slide-by-slide tutoring app — but only "
        "when a question is actually worth asking. Respond with ONLY a JSON object, no other "
        "text, matching this shape:\n"
        '{"questions": [{"type": "multiple_choice" | "short_answer", "prompt": str, '
        '"options": [str, str, str, str] | null, "correct_answer": str, '
        '"feedback": str}]}\n'
        "For multiple_choice, options must contain exactly 4 short choices and "
        "correct_answer must exactly match one of them. For short_answer, options is null "
        "and correct_answer is a brief model answer. feedback is 1-2 sentences explaining "
        "why the correct answer is right, shown to the student after they respond.\n\n"
        "If the slide is low-content (title slide, acknowledgments, agenda, section divider, "
        "references) or otherwise has nothing worth testing, return an empty questions array "
        "— do not invent a trivia question about metadata (who made the slides, what course "
        "this is) just to have one. Only ask about the actual subject matter being taught."
    )

    user_prompt = f"""Slide content:
{slide['raw_text'] or '(no extracted text)'}

Explanation just given to the student:
{explanation_text}

Student knowledge level: {knowledge_level}

Write up to {max_count} comprehension-check question(s) for this slide's subject matter, \
calibrated to the student's knowledge level — or fewer (including zero) if the slide doesn't \
warrant that many. Prefer multiple_choice; use short_answer only when a question like \
"explain this back to me" fits better."""

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1200,
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(response.choices[0].message.content)
    return parsed["questions"]


def answer_side_question(
    slide: dict, explanation_text: str, question: str, context_snippet: str | None = None
) -> str:
    system_prompt = (
        "You are a tutor answering a student's tangential question about the slide they're "
        "currently looking at. Answer only what they asked, using the slide's context — don't "
        "re-explain the whole slide. Keep it focused and concise (a few sentences, more only "
        "if the question needs it). Format as Markdown: short paragraphs, bold key terms, use "
        "a fenced code block for any code, and $...$ / $$...$$ for math."
    )

    anchor = (
        f"\n\nThe student is asking specifically about this part of the explanation: \"{context_snippet}\""
        if context_snippet
        else ""
    )

    user_prompt = f"""Current slide content:
{slide['raw_text'] or '(no extracted text)'}

Explanation already given for this slide:
{explanation_text}{anchor}

Student's question: {question}"""

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=600,
        temperature=0.6,
    )
    return response.choices[0].message.content.strip()
