from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.llm import answer_side_question
from app.models import Slide, SlideExplanation, SideQuestion
from app.schemas import SideQuestionCreate, SideQuestionOut

router = APIRouter(tags=["side-questions"])


@router.get("/slides/{slide_id}/side-questions", response_model=list[SideQuestionOut])
def list_side_questions(slide_id: int, db: Session = Depends(get_db)):
    slide = db.get(Slide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    rows = db.scalars(
        select(SideQuestion).where(SideQuestion.slide_id == slide_id).order_by(SideQuestion.created_at)
    ).all()
    return rows


@router.post("/slides/{slide_id}/side-questions", response_model=SideQuestionOut, status_code=201)
def ask_side_question(slide_id: int, payload: SideQuestionCreate, db: Session = Depends(get_db)):
    if not settings.groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend")

    slide = db.get(Slide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    latest_explanation = db.scalar(
        select(SlideExplanation)
        .where(SlideExplanation.slide_id == slide_id)
        .order_by(SlideExplanation.created_at.desc())
    )
    explanation_text = latest_explanation.explanation_text if latest_explanation else "(not yet generated)"

    current_slide = {"index": slide.index, "raw_text": slide.raw_text, "speaker_notes": slide.speaker_notes}

    try:
        answer = answer_side_question(current_slide, explanation_text, payload.question, payload.context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Side-question answering failed: {exc}") from exc

    row = SideQuestion(slide_id=slide_id, question=payload.question, answer=answer)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
