from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Boolean, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    slideshows: Mapped[list["Slideshow"]] = relationship(
        back_populates="folder", cascade="all, delete-orphan"
    )


class Slideshow(Base):
    __tablename__ = "slideshows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    folder_id: Mapped[int] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(20))  # pptx | pdf | image
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    knowledge_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    content_depth: Mapped[str | None] = mapped_column(String(20), nullable=True)
    timer_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    strict_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    current_slide_index: Mapped[int] = mapped_column(Integer, default=0)

    folder: Mapped["Folder"] = relationship(back_populates="slideshows")
    slides: Mapped[list["Slide"]] = relationship(
        back_populates="slideshow", cascade="all, delete-orphan", order_by="Slide.index"
    )


class Slide(Base):
    __tablename__ = "slides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slideshow_id: Mapped[int] = mapped_column(ForeignKey("slideshows.id", ondelete="CASCADE"))
    index: Mapped[int] = mapped_column(Integer)

    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rendered_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    embedded_image_paths: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list

    slideshow: Mapped["Slideshow"] = relationship(back_populates="slides")
    explanations: Mapped[list["SlideExplanation"]] = relationship(
        back_populates="slide", cascade="all, delete-orphan"
    )
    quiz_question_sets: Mapped[list["QuizQuestionSet"]] = relationship(
        cascade="all, delete-orphan"
    )
    side_questions: Mapped[list["SideQuestion"]] = relationship(
        cascade="all, delete-orphan"
    )
    user_answers: Mapped[list["UserAnswer"]] = relationship(
        cascade="all, delete-orphan"
    )


class SlideExplanation(Base):
    __tablename__ = "slide_explanations"
    __table_args__ = (
        UniqueConstraint("slide_id", "knowledge_level", "content_depth", name="uq_explanation_variant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slide_id: Mapped[int] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"))
    knowledge_level: Mapped[str] = mapped_column(String(20))
    content_depth: Mapped[str] = mapped_column(String(20))
    explanation_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    slide: Mapped["Slide"] = relationship(back_populates="explanations")


class QuizQuestionSet(Base):
    __tablename__ = "quiz_question_sets"
    __table_args__ = (
        UniqueConstraint("slide_id", "knowledge_level", "content_depth", name="uq_quiz_variant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slide_id: Mapped[int] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"))
    knowledge_level: Mapped[str] = mapped_column(String(20))
    content_depth: Mapped[str] = mapped_column(String(20))
    questions_json: Mapped[str] = mapped_column(Text)  # JSON list of question dicts
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserAnswer(Base):
    __tablename__ = "user_answers"
    __table_args__ = (
        UniqueConstraint(
            "slide_id", "knowledge_level", "content_depth", "question_index", name="uq_user_answer"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slide_id: Mapped[int] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"))
    knowledge_level: Mapped[str] = mapped_column(String(20))
    content_depth: Mapped[str] = mapped_column(String(20))
    question_index: Mapped[int] = mapped_column(Integer)
    given_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    attempts: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SideQuestion(Base):
    __tablename__ = "side_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slide_id: Mapped[int] = mapped_column(ForeignKey("slides.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
