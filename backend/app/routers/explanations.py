from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.llm import generate_explanation
from app.models import Slide, SlideExplanation
from app.schemas import ExplanationOut

router = APIRouter(tags=["explanations"])

VALID_LEVELS = {"basic", "intermediate", "advanced"}
VALID_DEPTHS = {"surface", "balanced", "in_depth"}


@router.get("/slides/{slide_id}/explanation", response_model=ExplanationOut)
def get_explanation(
    slide_id: int,
    knowledge_level: str = Query(...),
    content_depth: str = Query(...),
    db: Session = Depends(get_db),
):
    if knowledge_level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"knowledge_level must be one of {VALID_LEVELS}")
    if content_depth not in VALID_DEPTHS:
        raise HTTPException(status_code=400, detail=f"content_depth must be one of {VALID_DEPTHS}")
    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend")

    slide = db.get(Slide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    existing = db.scalar(
        select(SlideExplanation).where(
            SlideExplanation.slide_id == slide_id,
            SlideExplanation.knowledge_level == knowledge_level,
            SlideExplanation.content_depth == content_depth,
        )
    )
    if existing:
        return ExplanationOut(
            knowledge_level=knowledge_level,
            content_depth=content_depth,
            explanation_text=existing.explanation_text,
            cached=True,
        )

    prior_slides_orm = db.scalars(
        select(Slide)
        .where(Slide.slideshow_id == slide.slideshow_id, Slide.index < slide.index)
        .order_by(Slide.index)
    ).all()
    prior_slides = [
        {"index": s.index, "raw_text": s.raw_text, "speaker_notes": s.speaker_notes}
        for s in prior_slides_orm
    ]
    current_slide = {"index": slide.index, "raw_text": slide.raw_text, "speaker_notes": slide.speaker_notes}

    try:
        explanation_text = generate_explanation(current_slide, prior_slides, knowledge_level, content_depth)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Explanation generation failed: {exc}") from exc

    db.add(
        SlideExplanation(
            slide_id=slide_id,
            knowledge_level=knowledge_level,
            content_depth=content_depth,
            explanation_text=explanation_text,
        )
    )
    db.commit()

    return ExplanationOut(
        knowledge_level=knowledge_level,
        content_depth=content_depth,
        explanation_text=explanation_text,
        cached=False,
    )
