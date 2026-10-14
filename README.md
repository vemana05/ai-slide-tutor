# AI Slide Tutor

An app where you upload a slideshow (`.pptx`, `.pdf`, or images) and it teaches you through it slide-by-slide: a rendered view of the actual slide, an AI-generated explanation tuned to your knowledge level and how deep you want to go, comprehension quizzes woven into the explanation, and a side-question panel for tangents that doesn't derail the main lesson.

This document describes the app **as currently built**. The original product spec it was built from is [`instructions.md`](./instructions.md) — that file describes the full long-term vision (including things not built yet, like auth, billing, and Pro/Claude routing). This README describes what actually exists in the code right now, and calls out where the build has intentionally diverged from that spec based on real usage feedback.

## Status

Everything below is implemented and working against a local Postgres database. There is no auth, no deployment, and no billing yet — it's a local single-user app for now.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 | Simple SPA, no SSR needed |
| Routing | react-router-dom v7 | Folder → Slideshow → Slide Viewer navigation |
| Markdown/Math | react-markdown + remark-math + rehype-katex | Renders AI output, including LaTeX formulas |
| Backend | Python 3.12 + FastAPI | Needed for `python-pptx` / PyMuPDF, which have no good JS equivalents |
| Database | PostgreSQL 16 (local, via Homebrew) | Relational data (folders → slideshows → slides → generated content) |
| File parsing | `python-pptx`, PyMuPDF (`pymupdf`), headless LibreOffice (`soffice`) | Extract text/notes/images, and render exact slide screenshots |
| AI | Groq API (`openai/gpt-oss-120b`) | Free-tier hosted open-weight model — deliberately **not** the Claude API, to keep this free to run (see "Model choice" below) |

## One-time machine setup

These were installed during development and are assumed to exist:

- **Homebrew** — package manager, used to install everything below.
- **Node.js** (`brew install node`) — for the frontend.
- **Python 3.12** (`brew install python@3.12`) — the backend venv is built on this, not the system Python.
- **PostgreSQL 16** (`brew install postgresql@16`, running as a `brew services` background service). Database name: `teaching_slides_app`.
- **LibreOffice** (`brew install --cask libreoffice`) — headless `soffice` is shelled out to convert `.pptx` → `.pdf` so slides can be rendered as real images (see "Slide rendering" below).
- A **Groq API key** (free, from console.groq.com) in `backend/.env` as `GROQ_API_KEY`.

## Running it

```bash
# Backend (from backend/)
source venv/bin/activate  # or just call ./venv/bin/uvicorn directly
uvicorn app.main:app --port 8000

# Frontend (from frontend/)
npm run dev -- --port 5173
```

Then open `http://localhost:5173`. The backend must be running for the frontend to do anything beyond render an empty shell — there's no mock/offline mode.

Postgres must already be running (`brew services start postgresql@16`) and the `teaching_slides_app` database must exist (`createdb teaching_slides_app`).

## Project structure

```
backend/
  app/
    main.py              FastAPI app setup, CORS, static file mount, router registration
    config.py             Settings (.env loading) + STORAGE_PATH
    database.py            SQLAlchemy engine/session
    models.py               All ORM models (see Data model below)
    schemas.py                Pydantic request/response schemas
    llm.py                     All Groq prompt construction and calls — explanations, quiz
                                 questions, side-question answers
    parsing/
      pptx_parser.py            Extracts text/notes/embedded images via python-pptx,
                                  renders slide images via LibreOffice
      pdf_parser.py               Extracts text + renders page images via PyMuPDF
      image_parser.py              Handles raw image uploads (one slide per image)
      office_render.py              Shells out to `soffice --headless --convert-to pdf`
    routers/
      folders.py                    Folder CRUD
      slideshows.py                   Upload/parse, onboarding settings, progress
      explanations.py                  GET explanation (generates + caches on first call)
      quiz.py                           GET comprehension questions (generates + caches)
      answers.py                         Record/read quiz answers, slideshow-wide quiz tally
      side_questions.py                   The "/btw" tangential-question thread
  storage/                                Uploaded originals + extracted/rendered images
                                            (gitignored-worthy, not committed)

frontend/
  src/
    App.jsx                Route definitions + top-level shell
    api.js                   All backend fetch calls in one place
    pages/
      FolderListPage.jsx       Top-level folder grid
      SlideshowListPage.jsx      Upload form + slideshow grid within a folder
      SlideViewerPage.jsx          The main teaching UI — biggest/most complex file
    components/
      OnboardingForm.jsx           Knowledge level / depth / timer / strict-mode picker
      ExplanationView.jsx            Splits AI markdown into blocks, interleaves quiz
                                       questions, adds hover-to-ask on paragraphs
      Question.jsx                     One quiz question — multiple-choice (2-try limit)
                                         or short-answer
      SideQuestionDrawer.jsx             The right-side "/btw" panel
      StudyTimer.jsx                      Pomodoro-style study/break timer
    lib/markdown.js                        Normalizes LaTeX delimiters before rendering
```

## Data model

```
Folder
 └── Slideshow (knowledge_level, content_depth, timer_enabled, strict_mode, current_slide_index)
      └── Slide (raw_text, speaker_notes, rendered_image_path, embedded_image_paths)
           ├── SlideExplanation      (one per knowledge_level × content_depth combo, cached)
           ├── QuizQuestionSet       (one per knowledge_level × content_depth combo, cached)
           ├── UserAnswer            (one per question_index × level × depth — tracks attempts)
           └── SideQuestion          (the "/btw" thread — append-only)
```

All foreign keys cascade on delete (deleting a folder deletes its slideshows, slides, explanations, quizzes, answers, and side-questions).

Explanations and quiz questions are **generated lazily and cached**: the first time you view a slide at a given knowledge-level/depth combination, it calls Groq and stores the result; every subsequent view of that same combination is a free database read, not a new API call.

## API surface

All routes are under the FastAPI app in `backend/app/main.py`. No auth — anyone who can reach the port can call these.

- `GET/POST/PATCH/DELETE /folders`, `/folders/{id}`
- `GET/POST /folders/{folder_id}/slideshows`
- `GET/PATCH/DELETE /slideshows/{id}`
- `PATCH /slideshows/{id}/onboarding` — sets knowledge level, depth, timer, strict mode
- `PATCH /slideshows/{id}/progress` — saves `current_slide_index` (used by "Save & exit" and every Next/Previous click)
- `GET /slides/{id}/explanation?knowledge_level=&content_depth=`
- `GET /slides/{id}/questions?knowledge_level=&content_depth=`
- `GET/POST /slides/{id}/answers` — per-question answer, with attempt-count upsert
- `GET /slideshows/{id}/quiz-summary?knowledge_level=&content_depth=` — running correct/total tally across the whole deck
- `GET/POST /slides/{id}/side-questions`
- Static files served at `/storage/...` (uploaded originals + extracted/rendered images)

## Slide rendering

This was a deliberate design choice worth explaining: `.pdf` uploads render trivially (PyMuPDF turns each page into a PNG). `.pptx` has no such built-in renderer in Python, so slides are converted `.pptx → .pdf` via headless LibreOffice, then rendered the same way as native PDFs — meaning what you see on screen is a pixel-accurate screenshot of the real slide (tables, images, fonts, layout included), not a reconstruction from extracted text.

## Model choice: Groq, not Claude

The original spec (`instructions.md`, §3.10) describes a paid/free split: a free open-weight model for most users, Claude reserved for a paid "in-depth" tier. Since this project isn't deployed or monetized yet, **all** explanation generation currently goes through Groq's free-hosted `openai/gpt-oss-120b`, and the Claude/Stripe paid-tier gating described in the spec has not been built. This was an explicit choice to avoid Anthropic API costs during development — see the spec's §3.10 and §7 for the intended long-term routing logic if that gets built later.

## Where this has diverged from `instructions.md`

Built through iterative use and feedback, a few things ended up different from the original spec:

- **Layout**: the spec suggested a side-by-side two-pane view (slide left, explanation right). In practice this was replaced with a single-column, top-to-bottom scrolling layout — the slide is a normal block at the top (not pinned), the explanation flows underneath it, and all navigation/action buttons live in a bar fixed to the bottom of the screen.
- **Comprehension questions are interleaved** throughout the explanation (after roughly every other paragraph) rather than appearing as a block at the end, and the AI is explicitly told to generate **zero** questions for low-content slides (title slides, acknowledgments, agendas) rather than always producing at least one.
- **Side questions ("/btw")** open a right-side drawer rather than an inline collapsible panel, and clicking "Ask about this" on a specific paragraph passes that paragraph as hidden context to the AI without pre-filling the visible input box.
- **Quiz retry mechanic**: multiple-choice questions get exactly 2 attempts. A second wrong answer reveals the correct one and does not count toward the running "correct" tally, but does count toward "total answered."
- **Explanation tone/length**: the spec's depth descriptions (§3.3b) are honored, but the prompt was tightened repeatedly toward brevity — word-count targets are treated as hard ceilings, not goals, and the model is explicitly told to give one-sentence acknowledgment of low-content slides rather than padding to a target length.
- **Math rendering**: not in the original spec at all — added once slides with formulas surfaced the need. Uses KaTeX; a normalization step rewrites `\( \)` / `\[ \]` delimiters to `$ $` / `$$ $$` before rendering, since the model doesn't reliably follow the requested delimiter style on its own.

## What's in the spec but not built yet

Following `instructions.md`'s own suggested build order (§9), these remain undone:

- Annotation detection (vision pass over scanned/handwritten slide markup)
- Interactive code box + AI code feedback
- Generation progress/loading bar (currently: explanations generate on-demand per slide with a simple "Thinking through this slide…" state, no multi-step progress UI)
- Milestone celebrations (25/50/75/100% toasts)
- Free vs. Pro model tier, lock icon, Stripe upgrade flow
- Auth, per-user quotas, and public deployment

## Known limitations

- No authentication — this is a single-user local app.
- No file size/type validation beyond the upload-form's `accept` attribute.
- Study timer settings (duration) are session-only — they reset to 20/5 on page reload, not persisted per slideshow.
- The quiz "total" shown in the running tally reflects questions *encountered so far*, not a pre-known total for the whole deck (since questions are generated lazily, per-slide, only once you reach that slide).
