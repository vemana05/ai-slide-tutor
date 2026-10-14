import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.llm import generate_questions
from app.models import Slide, SlideExplanation, QuizQuestionSet
from app.schemas import QuestionSetOut

router = APIRouter(tags=["quiz"])

VALID_LEVELS = {"basic", "intermediate", "advanced"}
VALID_DEPTHS = {"surface", "balanced", "in_depth"}


@router.get("/slides/{slide_id}/questions", response_model=QuestionSetOut)
def get_questions(
    slide_id: int,
    knowledge_level: str = Query(...),
    content_depth: str = Query(...),
    db: Session = Depends(get_db),
):
    if knowledge_level not in VALID_LEVELS or content_depth not in VALID_DEPTHS:
        raise HTTPException(status_code=400, detail="Invalid knowledge_level or content_depth")
    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend")

    slide = db.get(Slide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    existing = db.scalar(
        select(QuizQuestionSet).where(
            QuizQuestionSet.slide_id == slide_id,
            QuizQuestionSet.knowledge_level == knowledge_level,
            QuizQuestionSet.content_depth == content_depth,
        )
    )
    if existing:
        return QuestionSetOut(questions=json.loads(existing.questions_json), cached=True)

    explanation = db.scalar(
        select(SlideExplanation).where(
            SlideExplanation.slide_id == slide_id,
            SlideExplanation.knowledge_level == knowledge_level,
            SlideExplanation.content_depth == content_depth,
        )
    )
    if not explanation:
        raise HTTPException(
            status_code=409,
            detail="Generate the explanation for this slide/level/depth before requesting questions.",
        )

    current_slide = {"index": slide.index, "raw_text": slide.raw_text, "speaker_notes": slide.speaker_notes}

    try:
        questions = generate_questions(current_slide, explanation.explanation_text, knowledge_level, content_depth)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Question generation failed: {exc}") from exc

    db.add(
        QuizQuestionSet(
            slide_id=slide_id,
            knowledge_level=knowledge_level,
            content_depth=content_depth,
            questions_json=json.dumps(questions),
        )
    )
    db.commit()

    return QuestionSetOut(questions=questions, cached=False)
