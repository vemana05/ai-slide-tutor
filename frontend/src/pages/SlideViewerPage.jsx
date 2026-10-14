import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getExplanation,
  getQuestions,
  getQuizSummary,
  getSlideshow,
  listAnswers,
  recordAnswer,
  storageUrl,
  updateOnboarding,
  updateProgress,
} from "../api";
import ExplanationView from "../components/ExplanationView";
import OnboardingForm from "../components/OnboardingForm";
import SideQuestionDrawer from "../components/SideQuestionDrawer";
import StudyTimer from "../components/StudyTimer";

export default function SlideViewerPage() {
  const { slideshowId } = useParams();
  const navigate = useNavigate();
  const [slideshow, setSlideshow] = useState(null);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [saved, setSaved] = useState(false);

  const [explanation, setExplanation] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [priorAnswers, setPriorAnswers] = useState([]);
  const [answeredIndices, setAnsweredIndices] = useState(new Set());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState(null);
  const [quizSummary, setQuizSummary] = useState(null);

  useEffect(() => {
    getSlideshow(slideshowId)
      .then((s) => {
        setSlideshow(s);
        setCurrentIndex(s.current_slide_index || 0);
      })
      .catch((e) => setError(e.message));
  }, [slideshowId]);

  function refreshQuizSummary(level, depth) {
    getQuizSummary(slideshowId, level, depth)
      .then(setQuizSummary)
      .catch(() => {});
  }

  useEffect(() => {
    if (!slideshow || !slideshow.knowledge_level || !slideshow.content_depth) return;

    const slide = slideshow.slides[currentIndex];
    const { knowledge_level: level, content_depth: depth } = slideshow;

    setExplanation(null);
    setQuestions([]);
    setPriorAnswers([]);
    setAnsweredIndices(new Set());
    setExplanationError(null);
    setExplanationLoading(true);
    setShowExtractedText(false);

    getExplanation(slide.id, level, depth)
      .then((exp) => {
        setExplanation(exp);
        return Promise.all([
          getQuestions(slide.id, level, depth),
          listAnswers(slide.id, level, depth),
        ]);
      })
      .then(([questionRes, answerRes]) => {
        setQuestions(questionRes.questions);
        setPriorAnswers(answerRes);
        setAnsweredIndices(new Set(answerRes.map((a) => a.question_index)));
      })
      .catch((e) => setExplanationError(e.message))
      .finally(() => setExplanationLoading(false));

    refreshQuizSummary(level, depth);
  }, [slideshow, currentIndex]);

  async function handleOnboardingSubmit({ knowledgeLevel, contentDepth, timerEnabled, strictMode }) {
    const updated = await updateOnboarding(slideshowId, {
      knowledgeLevel,
      contentDepth,
      timerEnabled,
      strictMode,
    });
    setSlideshow((prev) => ({ ...prev, ...updated }));
    setShowSettings(false);
  }

  async function goToSlide(index) {
    setCurrentIndex(index);
    try {
      await updateProgress(slideshowId, index);
    } catch {
      // non-critical — progress just won't resume exactly here next time
    }
  }

  async function handleSaveAndExit() {
    try {
      await updateProgress(slideshowId, currentIndex);
    } catch {
      // still navigate away even if the save call fails
    }
    setSaved(true);
    setTimeout(() => navigate(`/folders/${slideshow.folder_id}`), 400);
  }

  function handleAnswered(questionIndex, { givenAnswer, isCorrect }) {
    setAnsweredIndices((prev) => new Set(prev).add(questionIndex));
    recordAnswer(slideshow.slides[currentIndex].id, {
      knowledgeLevel: slideshow.knowledge_level,
      contentDepth: slideshow.content_depth,
      questionIndex,
      givenAnswer,
      isCorrect,
    })
      .then(() => refreshQuizSummary(slideshow.knowledge_level, slideshow.content_depth))
      .catch(() => {});
  }

  function openAskDrawer(quote) {
    setDrawerContext(quote || null);
    setDrawerOpen(true);
  }

  if (error) return <p className="text-rust">{error}</p>;
  if (!slideshow) return <p className="text-paper/70">Loading…</p>;

  const needsOnboarding = !slideshow.knowledge_level || !slideshow.content_depth;
  const slide = slideshow.slides[currentIndex];
  const total = slideshow.slides.length;
  const percent = Math.round(((currentIndex + 1) / total) * 100);
  const quizComplete = answeredIndices.size >= questions.length;
  const nextDisabled =
    currentIndex === total - 1 || (slideshow.strict_mode && explanation && !quizComplete);

  return (
    <div>
      {!needsOnboarding && !showSettings && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1.5 bg-ink">
          <div
            className="h-full bg-marker-coral transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {!needsOnboarding && slideshow.timer_enabled && <StudyTimer />}

      <Link
        to={`/folders/${slideshow.folder_id}`}
        className="font-body text-sm text-paper/60 hover:text-paper"
      >
        ← {slideshow.title}
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-paper">{slideshow.title}</h1>
        {!needsOnboarding && (
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-paper/60">
              Slide {currentIndex + 1} / {total} · {percent}%
            </span>
            {quizSummary && quizSummary.total > 0 && (
              <span className="rounded-full bg-sage/15 px-2.5 py-1 font-body text-xs font-medium text-sage">
                Quiz {quizSummary.correct}/{quizSummary.total}
              </span>
            )}
          </div>
        )}
      </div>

      {(needsOnboarding || showSettings) && (
        <div className="mt-6">
          <OnboardingForm initial={slideshow} onSubmit={handleOnboardingSubmit} />
        </div>
      )}

      {!needsOnboarding && !showSettings && (
        <div className="pb-36">
          <div className="mt-4 rounded-lg bg-paper p-3 text-ink shadow-lg">
            {slide.rendered_image_path ? (
              <img
                src={storageUrl(slide.rendered_image_path)}
                alt={`Slide ${currentIndex + 1}`}
                className="max-h-[34vh] w-full rounded-md border border-ink/10 object-contain"
              />
            ) : slide.raw_text ? (
              <pre className="max-h-[34vh] overflow-y-auto whitespace-pre-wrap p-3 font-body text-sm leading-relaxed">
                {slide.raw_text}
              </pre>
            ) : (
              <p className="p-3 font-body text-ink/50">No extracted content for this slide.</p>
            )}
          </div>

          <div className="mt-5">
            {slide.rendered_image_path && (slide.raw_text || slide.speaker_notes) && (
              <button
                onClick={() => setShowExtractedText((v) => !v)}
                className="mb-3 font-body text-xs text-paper/40 underline hover:text-paper/70"
              >
                {showExtractedText ? "Hide" : "Show"} extracted text
              </button>
            )}

            {showExtractedText && (
              <div className="mb-5 rounded-md border border-paper/10 bg-ink/[0.03] p-4">
                {slide.raw_text && (
                  <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed text-paper/70">
                    {slide.raw_text}
                  </pre>
                )}
                {slide.speaker_notes && (
                  <div className="mt-2 rounded-md bg-chalk-gold/10 p-3">
                    <p className="font-body text-xs font-medium text-paper/60">Speaker notes</p>
                    <p className="mt-1 font-body text-sm text-paper/80">{slide.speaker_notes}</p>
                  </div>
                )}
              </div>
            )}

            {explanationLoading && (
              <p className="font-body text-paper/60">Thinking through this slide…</p>
            )}
            {explanationError && <p className="font-body text-rust">{explanationError}</p>}
            {explanation && (
              <ExplanationView
                explanationText={explanation.explanation_text}
                questions={questions}
                priorAnswers={priorAnswers}
                onAnswered={handleAnswered}
                onAsk={openAskDrawer}
              />
            )}
          </div>
        </div>
      )}

      {!needsOnboarding && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-paper/10 bg-ink px-4 py-2.5">
          <div className="mx-auto flex max-w-5xl flex-col gap-2">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => openAskDrawer(null)}
                className="font-body text-xs text-chalk-gold hover:brightness-110 sm:text-sm"
              >
                Ask about this slide
              </button>
              <button
                onClick={handleSaveAndExit}
                className="font-body text-xs text-paper/60 hover:text-paper sm:text-sm"
              >
                {saved ? "Saved ✓" : "Save & exit"}
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="font-body text-xs text-paper/60 underline hover:text-paper sm:text-sm"
              >
                Settings
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => goToSlide(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="rounded-md bg-paper/10 px-4 py-2 font-body text-sm text-paper transition-colors hover:bg-paper/20 disabled:opacity-30"
              >
                Previous
              </button>

              <button
                onClick={() => goToSlide(Math.min(total - 1, currentIndex + 1))}
                disabled={nextDisabled}
                title={
                  slideshow.strict_mode && explanation && !quizComplete
                    ? "Answer the quick check questions to continue"
                    : undefined
                }
                className="rounded-md bg-marker-coral px-4 py-2 font-body text-sm font-medium text-paper transition-colors hover:brightness-110 disabled:opacity-30"
              >
                Next Slide
              </button>
            </div>
          </div>
        </div>
      )}

      <SideQuestionDrawer
        slideId={slide.id}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        context={drawerContext}
      />
    </div>
  );
}
