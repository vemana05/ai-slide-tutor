from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FolderCreate(BaseModel):
    name: str


class FolderUpdate(BaseModel):
    name: str


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime
    slideshow_count: int = 0


class SlideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    index: int
    raw_text: str | None
    speaker_notes: str | None
    rendered_image_path: str | None
    embedded_image_paths: list[str]


class SlideshowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folder_id: int
    title: str
    original_filename: str
    source_type: str
    upload_date: datetime
    knowledge_level: str | None
    content_depth: str | None
    timer_enabled: bool
    strict_mode: bool
    current_slide_index: int
    slide_count: int = 0


class SlideshowDetailOut(SlideshowOut):
    slides: list[SlideOut]


class ExplanationOut(BaseModel):
    knowledge_level: str
    content_depth: str
    explanation_text: str
    cached: bool


class QuestionOut(BaseModel):
    type: str
    prompt: str
    options: list[str] | None
    correct_answer: str
    feedback: str


class QuestionSetOut(BaseModel):
    questions: list[QuestionOut]
    cached: bool


class UserAnswerCreate(BaseModel):
    knowledge_level: str
    content_depth: str
    question_index: int
    given_answer: str
    is_correct: bool


class UserAnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_index: int
    given_answer: str
    is_correct: bool
    attempts: int


class QuizSummaryOut(BaseModel):
    correct: int
    total: int


class ProgressUpdate(BaseModel):
    current_slide_index: int


class SideQuestionCreate(BaseModel):
    question: str
    context: str | None = None


class SideQuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str
    created_at: datetime


class OnboardingUpdate(BaseModel):
    knowledge_level: str  # basic | intermediate | advanced
    content_depth: str  # surface | balanced | in_depth
    timer_enabled: bool = False
    strict_mode: bool = False
