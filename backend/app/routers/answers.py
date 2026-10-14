from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Slide, UserAnswer
from app.schemas import QuizSummaryOut, UserAnswerCreate, UserAnswerOut

router = APIRouter(tags=["answers"])


@router.get("/slides/{slide_id}/answers", response_model=list[UserAnswerOut])
def list_answers(
    slide_id: int,
    knowledge_level: str = Query(...),
    content_depth: str = Query(...),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(UserAnswer).where(
            UserAnswer.slide_id == slide_id,
            UserAnswer.knowledge_level == knowledge_level,
            UserAnswer.content_depth == content_depth,
        )
    ).all()
    return rows


@router.post("/slides/{slide_id}/answers", response_model=UserAnswerOut, status_code=201)
def record_answer(slide_id: int, payload: UserAnswerCreate, db: Session = Depends(get_db)):
    slide = db.get(Slide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    stmt = (
        pg_insert(UserAnswer)
        .values(
            slide_id=slide_id,
            knowledge_level=payload.knowledge_level,
            content_depth=payload.content_depth,
            question_index=payload.question_index,
            given_answer=payload.given_answer,
            is_correct=payload.is_correct,
            attempts=1,
        )
        .on_conflict_do_update(
            constraint="uq_user_answer",
            set_={
                "given_answer": payload.given_answer,
                "is_correct": payload.is_correct,
                "attempts": UserAnswer.attempts + 1,
            },
        )
        .returning(UserAnswer)
    )
    row = db.scalars(stmt).one()
    db.commit()
    return row


@router.get("/slideshows/{slideshow_id}/quiz-summary", response_model=QuizSummaryOut)
def quiz_summary(
    slideshow_id: int,
    knowledge_level: str = Query(...),
    content_depth: str = Query(...),
    db: Session = Depends(get_db),
):
    correct, total = db.execute(
        select(
            func.count().filter(UserAnswer.is_correct.is_(True)),
            func.count(),
        )
        .select_from(UserAnswer)
        .join(Slide, Slide.id == UserAnswer.slide_id)
        .where(
            Slide.slideshow_id == slideshow_id,
            UserAnswer.knowledge_level == knowledge_level,
            UserAnswer.content_depth == content_depth,
        )
    ).one()
    return QuizSummaryOut(correct=correct, total=total)
