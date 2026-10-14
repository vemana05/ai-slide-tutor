AI Slide Tutor — Product & Technical Spec
1. One-line pitch
An app where a user uploads any slideshow (lecture, deck, textbook slides, etc.) and Claude walks them through it slide-by-slide like a personal tutor — adapting to their knowledge level, answering tangential questions without losing context, generating interactive code boxes for programming content, and reading any annotations already on the slides.
2. Core User Flow
User creates/selects a folder (e.g. "CS 2114", "Organic Chem", "Personal Learning").
User uploads a slideshow into that folder (.pptx, .pdf, or images).
App parses the file: extracts slide text, images, speaker notes, and any visible annotations (highlights, handwritten notes, arrows, circled text, margin comments).
Onboarding questions:
"What's your knowledge level for this material?" → Basic / Intermediate / Advanced.
"How deep do you want to go?" → Surface-level / Balanced / In-depth 🔒 (locked for free users — see Section 3.10 for what happens when it's tapped).
Optional: "Use a study timer?" → on/off (default pattern: 20 min study / 5 min break, configurable).
All are single-select, stored per slideshow, and the user can change any of them mid-session.
Generation step: app shows a progress/loading bar with an estimated time remaining while Claude generates the full teaching plan (see Section 4).
Teaching session begins:
Slide 1 is shown alongside Claude's explanation, pitched at the chosen level.
If the slide contains code, an interactive code box appears where the user can write/run code related to that slide.
After the explanation, Claude asks 1–3 comprehension check questions before unlocking "Next Slide."
At any point, the user can ask a side question ("/btw ...") about the current slide without derailing the main lesson — this is answered in a separate thread/panel that stays anchored to that slide.
User proceeds through the deck slide-by-slide, with progress saved so they can resume later.
Session/progress is stored under that slideshow's folder for future review.
3. Feature Breakdown
3.1 Folders / Organization
Top-level "Folders" (a.k.a. Classes/Subjects) — user-creatable, renameable, deletable.
Each folder contains one or more uploaded slideshows.
Each slideshow tracks: upload date, knowledge level chosen, progress (which slide the user is on), and session history.
Optional: tags/color-coding per folder.
3.2 Slideshow Upload & Parsing
Accept .pptx, .pdf, and common image formats (for scanned slides).
Extract per slide:
Raw text (titles, bullet points, body text)
Speaker notes (if present in .pptx)
Embedded images/diagrams
Any code blocks (detect via formatting/monospace font or content heuristics)
Annotation handling: if slides contain highlights, handwritten notes, circles, arrows, or margin scribbles (common in scanned/exported lecture slides), run these through a vision-capable model pass to describe what was annotated and why it likely matters (e.g., "the professor highlighted 'Big-O of O(log n)' — likely an exam-relevant point"). This annotation context gets folded into the teaching explanation for that slide.
3.3 Knowledge-Level Adaptive Teaching
Three levels: Basic, Intermediate, Advanced (selectable per slideshow at start, changeable mid-session).
Basic: analogies, no jargon without definition, slower pacing, more examples.
Intermediate: assumes foundational knowledge, moderate jargon, connects to related concepts.
Advanced: dense, technical, assumes prerequisite fluency, focuses on nuance/edge cases.
Level choice affects: vocabulary, number/difficulty of comprehension questions, and how much hand-holding the code box gives.
This is independent from Content Depth below — a beginner can still ask for in-depth coverage (just explained more simply), and an advanced user might want only a surface-level pass to refresh their memory.
3.3b Content Depth Selector
A second, independent axis from knowledge level — this controls how much of the slide's content gets covered, not how simply it's explained.
Surface-level: Hits only the main point of the slide in a few sentences. Good for a quick pass/review or skimming a deck before class.
Balanced (default): Covers the main point plus the supporting details and why they matter — the standard "full explanation" experience.
In-depth 🔒: Expands beyond just what's on the slide — pulls in related context, edge cases, common misconceptions, and follow-up implications. Effectively "teach me everything connected to this, not just what's written." Gated to Pro users — see Section 3.10 for the lock/upgrade behavior on this exact option.
Like knowledge level, this is set per slideshow at onboarding and can be changed mid-session (e.g., a "quick surface pass" toggle per slide if the user just wants to skim one).
Depth choice primarily affects explanation length and scope; knowledge level affects explanation vocabulary and pacing. The two combine — e.g. "Basic + In-depth" means a thorough explanation that still avoids jargon and leans on analogies. Knowledge level (Basic/Intermediate/Advanced) is free at every tier — only the depth axis is gated.
3.4 Slide-by-Slide Teaching Engine
One explanation generated per slide (not the whole deck dumped at once), pulling in:
The slide's raw content
Any detected annotations
Prior slides' context (so explanations build on each other, not isolated)
The chosen knowledge level (vocabulary/pacing) and content depth (surface/balanced/in-depth scope)
Explanation is shown in a panel alongside (or below, on mobile) the slide image/content.
"Next Slide" is either always available, or gated behind answering the comprehension check(s) — make this a toggleable setting ("Strict mode").
3.5 Comprehension Checks
After each slide's explanation, Claude generates 1–3 short questions (multiple choice, short answer, or "explain this back to me").
Immediate feedback on answers, with a brief explanation of why the answer is right/wrong.
Wrong answers can trigger a lightweight re-explanation before moving on.
Track per-slideshow accuracy so the user can see where they're weak (feeds a simple "review these slides again" suggestion at the end).
3.6 Interactive Code Box
Auto-detected when a slide contains code or a coding concept.
A live code editor (syntax highlighting at minimum; running the code is a stretch goal — see Section 6) appears inline.
Claude can pose a coding exercise tied to that slide ("Try writing the function described here") and give feedback on the user's submission.
Support at least Python, JavaScript, and Java/C++ syntax highlighting to start (most common in intro CS decks).
3.7 Side-Question Feature ("/btw")
A persistent input (or a /btw command, or a dedicated "Ask about this slide" button) lets the user ask a tangential question at any time.
The question is answered using the current slide's full context (text + annotations + the explanation already given) so Claude doesn't need re-explaining what slide we're on.
These side-Q&A exchanges are shown in a distinct visual style (e.g., a side panel or collapsible thread) so they don't get mixed into the main linear lesson flow, but they remain reviewable per-slide later.
3.8 Loading / Progress Indicator
When generating the teaching plan for a newly uploaded deck, show a progress bar with:
Percentage complete
Estimated time remaining
Current step label (e.g., "Parsing slide 12 of 40", "Analyzing annotations", "Generating explanations")
Consider generating slide-by-slide on demand (as the user reaches each slide) rather than the whole deck up front, to make the first slide available almost instantly, with the loading bar reserved for e.g. annotation-heavy decks or a background "prep the whole deck" job.
3.9 Progress Bar & Milestones
A persistent progress bar (top of screen or sidebar) showing how far through the current slideshow the user is (e.g., "Slide 14 / 40").
Animated milestone celebrations at key checkpoints:
25% — small encouraging popup/emoji + short message ("🔥 Quarter of the way there!")
50% — bigger callout ("🎉 Halfway done!")
75% — ("💪 Almost there — final stretch!")
100% — a completion animation (confetti or similar) with a short summary of the session (slides covered, comprehension accuracy, time spent).
These should be brief, non-blocking toasts/overlays (auto-dismiss after ~2–3 seconds, or dismissible by clicking) so they celebrate progress without interrupting the lesson.
Keep a settings toggle to disable milestone popups for users who find them distracting.
3.10 Model Tier: Free (Open-Weight) vs. Pro (Claude) — Gated on Content Depth
Rather than a separate settings screen, the free/Pro distinction lives directly inside the onboarding depth selector the user already sees when uploading a slideshow (Section 2, step 4 / Section 3.3b).
Surface-level & Balanced → free for everyone. Backend routes these to a free-hosted open-weight model (e.g., Groq serving Llama/Gemma/Qwen — Groq is the hosting layer, not itself a model; the backend can pick or fall back between whichever free-hosted open model is fastest/most reliable at the time).
In-depth → shows a 🔒 lock icon directly on that option, right there in the same three-button depth selector — it's not a separate tab or menu, just the third choice visibly locked.
Knowledge level (Basic/Intermediate/Advanced) stays free at every tier — only the depth axis is gated. So a free user gets the full range of "how simply it's explained," just capped at "Balanced" for "how much gets covered."
What happens when the user taps the locked "In-depth" option, at that same onboarding step:
A bottom-sheet panel slides up from the bottom of the screen (smooth ease-out animation, consistent with the app's overall animated feel from Section 3.9/3.11).
The sheet's headline benefit is simple and concrete: In-depth teaching runs on Claude instead of a free open model — roughly 10x smarter, especially for catching nuance, edge cases, and misconceptions that a smaller free model tends to miss.
Below that, a Stripe Checkout button to upgrade.
If the user completes payment, the sheet dismisses, "In-depth" unlocks immediately (no page reload needed), and their onboarding selection proceeds with In-depth now selected.
If they close the sheet without paying, they just fall back to picking Surface-level or Balanced like normal — no dead end, no forced screen.
Backend routing logic (simplified):
if request.content_depth == "in_depth":
    if user.plan == "pro":
        route to Claude API (your key)
    else:
        return "locked" → frontend shows the upgrade bottom-sheet
else: # surface-level or balanced
    route to free open-weight model (Groq-hosted, with fallback across providers)
On successful Stripe payment, a webhook flips user.plan to "pro" in the database — the unlock is instant, nothing manual.
Pro should be a simple recurring monthly subscription, cancelable by the user from account settings, with Stripe handling the billing portal.
Even Pro users' Surface/Balanced requests can still route to the free backend to save you cost — reserve the Claude/Pro backend specifically for In-depth requests, unless you'd rather give Pro users Claude everywhere as part of the value of paying (a product call, not a technical one).
3.11 Study Timer / Break Mode
Optional feature, toggled on by the user at the start of a session (e.g., a "Use study timer" checkbox alongside the knowledge-level/depth selectors).
Default pattern: 20 minutes of study, then a 5-minute forced break (classic Pomodoro-style — make both durations user-configurable, with 20/5 as the default).
While studying: a small, unobtrusive countdown timer sits in a corner of the screen (e.g., top-right), showing time remaining in the current study block.
When the study timer hits zero:
The lesson view is overlaid with a large, friendly "Break time!" animation (e.g., a big emoji like ☕ or 🧘, gently animated — fade/scale in, maybe a subtle bounce).
A 5:00 countdown appears below it, ticking down.
A "Cancel break, keep learning" button sits below the countdown, letting the user skip the break and immediately resume — no penalty, just a click.
If the user lets the break run out naturally, the app automatically returns to the lesson and restarts the next study timer.
Should feel like a native, polished part of the app: smooth CSS transitions/animations (not jarring pop-ins), consistent with the rest of the UI's visual style, and should pause any in-progress AI generation calls rather than losing state.
Session stats (Section 3.5/3.9) should track total study time vs. break time taken, shown in the end-of-slideshow summary.
4. Suggested System Architecture
Frontend
React (or Next.js) SPA.
Key views: Folder list → Slideshow list (within folder) → Slide Viewer (main teaching UI).
State: current slide index, knowledge level, chat/side-question thread per slide, comprehension-check state, upload/generation progress.
Backend
Node.js/Express or Python (FastAPI) API server.
Responsibilities:
File upload handling & storage (slides + extracted assets)
Slide parsing (pptx/pdf → structured JSON per slide)
Orchestrating Claude API calls for: explanation generation, annotation analysis, comprehension question generation, side-question answering, code feedback
Progress tracking / job status for the loading bar (e.g., a simple job queue + polling or WebSocket push)
File Parsing
.pptx: use a library like python-pptx (Python) to extract text, notes, and images per slide.
.pdf: use pdfplumber/PyMuPDF for text, and render each page to an image for vision analysis (needed to catch annotations, diagrams, handwriting).
Images: pass directly to a vision-capable Claude model.
AI Integration (Claude API)
Vision pass per slide: send slide image → extract text, detect annotations/highlights/handwriting, describe diagrams.
Explanation generation: send slide content + annotations + prior-slide summary + knowledge level + content depth → structured explanation.
Comprehension question generation: send the explanation + slide content → 1–3 questions with answer key.
Side-question answering: send the slide's full context + user's question → focused answer.
Code feedback: send the code prompt + user's submitted code → correctness feedback/hints.
Use structured JSON outputs (via a system prompt requiring JSON-only responses) wherever the frontend needs to render structured UI (e.g., questions with options, code box config).
Data Model (simplified)
Folder
 └── Slideshow
      ├── metadata (title, upload date, knowledge_level, content_depth, timer_enabled, current_slide_index)
      └── Slide[]
           ├── raw_content (text, images, notes)
           ├── detected_annotations
           ├── generated_explanation (per knowledge_level + content_depth combo, cached)
           ├── comprehension_questions[]
           ├── user_answers[]
           ├── code_box (if applicable): prompt, starter_code, user_submissions[]
           └── side_questions[] (thread of Q&A tied to this slide)

User
 ├── auth info
 ├── plan ("free" / "pro" via Stripe) — determines model routing per Section 3.10
 ├── usage_quota (calls used today/this month, applies mainly to free-tier backend)
 └── byo_api_key (provider, encrypted key) — optional, advanced/opt-in only, overrides routing when set
Storage
Object storage (S3-compatible) for uploaded slideshows and extracted images.
Database (Postgres or similar) for folders, slideshows, slide metadata, generated content, progress, and Q&A threads.
5. Nice-to-Haves / Stretch Goals
Runnable code box: actually execute user code (sandboxed, e.g., via a service like Piston, Judge0, or a WASM-based runtime) instead of just syntax-highlighted feedback.
Text-to-speech narration of explanations for audio learners.
Spaced-repetition review mode: resurface slides the user got comprehension questions wrong on, days later.
Export session notes: let the user download a summary of what was taught + their side-question Q&A as a study guide (PDF/Markdown).
Multi-user folders: shared classes where multiple students' progress is tracked separately.
Dark mode / accessibility: font scaling, screen-reader friendly slide descriptions.
Drag-and-drop reordering of slideshows within folders.
Search across all past explanations/side-questions ("did Claude ever explain recursion to me before?").
6. Open Questions / Decisions Needed Before Building
Should the whole deck's explanations be pre-generated on upload, or generated lazily slide-by-slide as the user progresses? (Affects loading-bar UX — see 3.8.)
Should "Strict mode" (must answer comprehension questions to proceed) be on by default?
Do we need actual code execution, or is inline AI feedback on code sufficient for v1?
Single-user local app, or multi-user with accounts/auth?
Which file formats are must-have for v1 vs. later (.pptx and .pdf are the clear priorities; Google Slides export/Keynote are secondary)?
What daily/monthly quota per user keeps API costs predictable once public? (Start conservative — easy to raise later, harder to walk back.)
7. Deployment & Going Public (Free, Using Your Own Anthropic API Key)
Goal: anyone on the internet can use this app for free, and it's hosted publicly on its own URL.
How the Anthropic API key actually costs money
Getting an API key itself is free — you don't pay anything just for having one. You only pay per token actually used in API calls (input + output), billed to whichever account owns the key. So the real question isn't "does using my own key cost more," it's: if the app is public and free, every visitor's usage is billed to your key, since there's no per-user billing separating them. Cost scales with total usage across everyone who uses the app, not with the number of keys.
Concretely: a small number of casual users (a few slideshows a week) will likely cost you a few dollars a month. If it gets popular, costs can climb fast with nothing stopping them unless you add limits. So "free for everyone" and "unlimited for everyone" are two different promises — the plan below keeps it free while keeping your bill predictable.
Recommended approach: free but capped
Per-user daily/monthly quota — e.g. "3 slideshows per day" or "50 slide-explanations per day" per browser/account. Cheap to build (a counter in the database keyed by user ID or even just IP/browser fingerprint if you skip accounts).
Prompt caching — Claude's API supports prompt caching, which cuts costs significantly for repeated context (e.g., re-using the same slide's content across a comprehension question call and a side-question call). Worth implementing early since it's a big cost saver for this app's pattern (same slide context, multiple calls).
Shorter outputs by default — the "Surface-level" depth setting (Section 3.3b) naturally costs less per call than "In-depth," so depth choice doubles as a soft cost lever.
Cost alerts — set up billing alerts in the Anthropic Console (e.g., notify at $10, $25, $50/month) so you're never surprised.
Optional escape hatch — "Use your own AI" (multi-provider): let power users pick a provider (Claude, Gemini, ChatGPT/OpenAI) and paste in their own API key so their usage is billed to them, not you. See the important clarification below before building this.
Paid tier via Stripe (for everyone else): users who don't have their own API key can pay a small monthly fee via Stripe to get a higher usage quota drawn from your Anthropic key. This is the realistic version of "auto-login to my Claude" — see below.
Important clarification on "login with your own AI model"
One thing worth correcting before this gets built, since it changes what's actually possible: a consumer subscription (ChatGPT Plus, Claude Pro, Gemini Advanced, GitHub Copilot) is billed separately from that same company's developer API, and logging into the consumer app does not grant a third-party app access to use that subscription's usage. There's no "log in with your ChatGPT account" flow that lets your app send messages on the back of someone's $20/month ChatGPT Plus plan — OpenAI, Anthropic, and Google don't expose that. What does work is a developer API key, which is a separate product with its own pay-per-token billing (a user would generate this at console.anthropic.com, platform.openai.com, or Google AI Studio, then paste it into your app).
So the real, buildable version of this feature is: "Bring your own API key" — a settings screen where the user selects a provider (Claude / Gemini / OpenAI) and pastes in their API key from that provider's developer console, which your backend then uses for their requests instead of your own key.
Copilot doesn't fit this pattern — GitHub Copilot doesn't offer a general-purpose chat/completions API for third-party apps to plug into (it's scoped to code-completion inside IDEs), so it's realistically not an option here. Worth dropping from the picker, or replacing with a provider that does offer one.
For users who don't want to get their own key, the Stripe option above is the actual working substitute for "just let me pay you and use your Claude" — a small monthly fee unlocks a higher quota on your app's own key, no separate account needed on their end.
Store any pasted API keys encrypted at rest, never log them, and let users delete/rotate them at any time.
Hosting (all have free tiers sufficient for a small public app)
Piece	Suggested service
Frontend	Vercel or Netlify
Backend API	Render, Railway, or Fly.io
Database	Supabase or Neon (managed Postgres)
File storage (uploaded decks)	Cloudflare R2 (free egress) or AWS S3
Domain	Not required to launch — use the free subdomain your host provides (e.g. yourapp.vercel.app); it's a real, trusted HTTPS domain with no expiration. A custom domain (~$10–15/year via Namecheap or Cloudflare) is a pure later upgrade — swapping one in is a DNS setting, not a rebuild, so it costs nothing to defer this decision.
Other things "public" requires
Lightweight auth — even just "sign in with Google/email" (e.g., via Supabase Auth or Clerk's free tier) so quotas can be tied to a real user instead of just an IP, which is easy to abuse.
Upload limits & validation — cap file size (e.g., 20MB) and file type on upload so someone can't hammer your storage or backend.
Basic abuse protection — rate-limit the API routes themselves (not just the quota), so no single user/script can hammer Claude calls in a tight loop.
A one-line Terms note — since users upload course material, a short note that uploads are for personal study use and stored privately to their account covers you reasonably well without needing a lawyer.
8. Visual & Interaction Design System
The subject matter here is studying — slides, highlighters, annotations, index cards, the feeling of a focused study session. The design should be grounded in that, not in generic SaaS-dashboard styling. Below is a starting token system Claude Code can build from; treat it as a strong default, not a locked spec — adjust if a different direction emerges once real screens are built.
Color
Token	Hex	Use
ink	#16241F	Primary background — a deep, desaturated chalkboard green-black (not pure black), used for the main study/reading surface
paper	#F6F2E7	Card/panel surface — warm off-white, evokes a textbook page, used for the explanation panel and slide cards
marker-coral	#FF6A52	Primary accent — CTAs, active states, the milestone-celebration color (evokes a highlighter/marker pen, not a muted corporate accent)
chalk-gold	#F2C14E	Secondary accent — used specifically for annotation callouts, so "this was highlighted on the slide" visually echoes an actual highlighter
sage	#7BAE7F	Success state — correct answers, completed milestones
rust	#D65C5C	Error/incorrect state — used sparingly, never alarmist
This avoids the two most common "AI-generated" defaults: the cream-background-plus-terracotta look, and the black-background-plus-single-neon-accent look. The palette instead comes from the classroom/study-material world the app actually lives in.
Type
Headings/milestones: a characterful serif with some warmth — e.g. Fraunces or Lora — used for slide titles, milestone callouts, and the app's own name/logotype. This carries the "textbook" personality.
Body/UI: a clean, highly legible sans — e.g. Inter or Work Sans — for explanations, buttons, labels, and anything read at length. Explanation text stays under ~75 characters per line for readability.
Avoid: all-caps labels, tracked-out eyebrow text above every section, and accenting single words in headlines — these read as templated rather than designed.
Layout
Slide Viewer (core screen): two-pane layout on desktop — slide content on the left (~55%), Claude's explanation + comprehension question on the right (~45%), stacked vertically on mobile with the slide on top.
Progress bar: thin, persistent strip at the very top of the screen, not a chunky element competing with content.
Folders/slideshow list: a simple left-aligned grid of cards (not the identical-rounded-card SaaS look — vary card treatment slightly by content, e.g. a folder card looks like a tabbed folder, a slideshow card looks like a stacked deck).
Study timer: small, fixed-position pill in a corner (not a modal, not intrusive) — just time remaining, unobtrusive until it needs attention.
Upgrade bottom sheet: slides up from the bottom, rounded top corners only, dims the background behind it — standard mobile-native pattern, kept simple rather than over-decorated.
Motion — spend it deliberately, not everywhere
Per good motion practice: pick a small number of moments that deserve animation and make those great, rather than animating everything.
Milestone celebrations (25/50/75/100%): the one place to be genuinely playful — a quick, satisfying burst (scale + fade, maybe a small confetti/emoji pop at 100%). This is the app's one "fun" moment; let it be a little bold.
Break-mode overlay: a calm fade + gentle scale-in for the break emoji, not a bouncy/energetic animation — the motion should match the feeling of a break, unlike the milestone celebration's energy.
Upgrade bottom sheet: a single clean slide-up-and-settle with ease-out timing — fast enough to feel responsive, not a long showy animation.
Everywhere else: keep motion minimal and purposeful — a button press gets a subtle press-down, a "Next Slide" transition gets a quick crossfade. Avoid animating every card on hover or every section on scroll; that reads as generic rather than intentional.
Respect prefers-reduced-motion throughout — every animation above should have a reduced/instant fallback.
Voice & Copy
Write from the learner's perspective, in plain, encouraging language — "You're a quarter of the way through" rather than "25% Progress Milestone Achieved."
Buttons say exactly what they do: "Continue learning," "Start break," not generic labels like "Submit" or "Confirm."
Error/empty states are direction, not apology: an empty folder says "Upload your first slideshow to get started" rather than "No slideshows found."
Milestone and break-mode copy is where the personality shows most — keep it warm and a little fun ("Nice — quarter of the way in 🔥"), while the core explanation text itself stays clear and focused, since that's the part doing the actual teaching.
Quality floor (non-negotiable regardless of visual direction)
Fully responsive down to mobile widths.
Visible keyboard focus states on every interactive element.
Color contrast that holds up for accessibility (especially paper text on ink background — verify contrast ratio).
prefers-reduced-motion respected everywhere motion is used.
9. Suggested Build Order (for Claude Code)
Set up the design token system (Section 8) — colors, type, base layout shell — before building features on top of it, so everything that follows is visually consistent from the start.
Folder + slideshow upload scaffolding (no AI yet) — get file storage & parsing working, render raw slide content.
Knowledge-level + content-depth selectors + basic Claude-generated explanation per slide (static, no questions yet).
Add comprehension questions + answer checking.
Add annotation detection (vision pass) and fold into explanations.
Add code box detection + AI code feedback.
Add the /btw side-question feature with per-slide context threading.
Add the generation progress/loading bar (and decide pre-generate vs. lazy-generate based on Section 6, Q1).
Add slideshow progress bar with 25/50/75/100% milestone animations.
Add the optional study timer / break-mode overlay.
Add the free (open-weight) vs. Pro (Claude) model tier, lock icon, and bottom-sheet upgrade flow.
Polish: folders UI, progress tracking, resume-where-you-left-off, animation/transition pass across the app.
Add lightweight auth + per-user quotas, Stripe subscription billing/webhook, and (optional, advanced-only) BYO-API-key setting, then deploy publicly per Section 7.