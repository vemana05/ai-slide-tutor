from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import STORAGE_PATH
from app.database import Base, engine
from app.routers import answers, explanations, folders, quiz, side_questions, slideshows

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Slide Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")

app.include_router(folders.router)
app.include_router(slideshows.router)
app.include_router(explanations.router)
app.include_router(quiz.router)
app.include_router(side_questions.router)
app.include_router(answers.router)


@app.get("/health")
def health():
    return {"status": "ok"}
