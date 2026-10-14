import json
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import STORAGE_PATH
from app.database import get_db
from app.models import Folder, Slide, Slideshow
from app.parsing.image_parser import parse_images
from app.parsing.pdf_parser import parse_pdf
from app.parsing.pptx_parser import parse_pptx
from app.schemas import OnboardingUpdate, ProgressUpdate, SlideOut, SlideshowDetailOut, SlideshowOut

router = APIRouter(tags=["slideshows"])

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def _slideshow_out(slideshow: Slideshow) -> SlideshowOut:
    return SlideshowOut.model_validate(slideshow, from_attributes=True).model_copy(
        update={"slide_count": len(slideshow.slides)}
    )


def _slide_out(slide: Slide) -> SlideOut:
    return SlideOut(
        id=slide.id,
        index=slide.index,
        raw_text=slide.raw_text,
        speaker_notes=slide.speaker_notes,
        rendered_image_path=slide.rendered_image_path,
        embedded_image_paths=json.loads(slide.embedded_image_paths or "[]"),
    )


@router.get("/folders/{folder_id}/slideshows", response_model=list[SlideshowOut])
def list_slideshows(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return [_slideshow_out(s) for s in folder.slideshows]


@router.post("/folders/{folder_id}/slideshows", response_model=SlideshowDetailOut, status_code=201)
async def upload_slideshow(
    folder_id: int,
    title: str | None = Form(None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    extensions = {Path(f.filename).suffix.lower() for f in files}

    if len(files) == 1 and extensions <= {".pptx"}:
        source_type = "pptx"
    elif len(files) == 1 and extensions <= {".pdf"}:
        source_type = "pdf"
    elif extensions and extensions <= IMAGE_EXTENSIONS:
        source_type = "image"
    else:
        raise HTTPException(
            status_code=400,
            detail="Upload exactly one .pptx or .pdf file, or one or more image files.",
        )

    slideshow = Slideshow(
        folder_id=folder_id,
        title=title or Path(files[0].filename).stem,
        original_filename=files[0].filename,
        source_type=source_type,
    )
    db.add(slideshow)
    db.commit()
    db.refresh(slideshow)

    slideshow_dir = STORAGE_PATH / "slideshows" / str(slideshow.id)
    originals_dir = slideshow_dir / "originals"
    images_dir = slideshow_dir / "images"
    originals_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for f in files:
        dest = originals_dir / f.filename
        with dest.open("wb") as out:
            shutil.copyfileobj(f.file, out)
        saved_paths.append(dest)

    try:
        if source_type == "pptx":
            slide_dicts = parse_pptx(saved_paths[0], images_dir)
        elif source_type == "pdf":
            slide_dicts = parse_pdf(saved_paths[0], images_dir)
        else:
            images_dir.mkdir(parents=True, exist_ok=True)
            for path in saved_paths:
                shutil.copy(path, images_dir / path.name)
            slide_dicts = parse_images(saved_paths, images_dir)
    except Exception as exc:
        db.delete(slideshow)
        db.commit()
        shutil.rmtree(slideshow_dir, ignore_errors=True)
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}") from exc

    for index, slide_dict in enumerate(slide_dicts):
        db.add(
            Slide(
                slideshow_id=slideshow.id,
                index=index,
                raw_text=slide_dict["raw_text"],
                speaker_notes=slide_dict["speaker_notes"],
                rendered_image_path=slide_dict["rendered_image_path"],
                embedded_image_paths=json.dumps(slide_dict["embedded_image_paths"]),
            )
        )
    db.commit()
    db.refresh(slideshow)

    return SlideshowDetailOut(
        **_slideshow_out(slideshow).model_dump(),
        slides=[_slide_out(s) for s in slideshow.slides],
    )


@router.get("/slideshows/{slideshow_id}", response_model=SlideshowDetailOut)
def get_slideshow(slideshow_id: int, db: Session = Depends(get_db)):
    slideshow = db.get(Slideshow, slideshow_id)
    if not slideshow:
        raise HTTPException(status_code=404, detail="Slideshow not found")
    return SlideshowDetailOut(
        **_slideshow_out(slideshow).model_dump(),
        slides=[_slide_out(s) for s in slideshow.slides],
    )


@router.patch("/slideshows/{slideshow_id}/onboarding", response_model=SlideshowOut)
def update_onboarding(slideshow_id: int, payload: OnboardingUpdate, db: Session = Depends(get_db)):
    slideshow = db.get(Slideshow, slideshow_id)
    if not slideshow:
        raise HTTPException(status_code=404, detail="Slideshow not found")
    slideshow.knowledge_level = payload.knowledge_level
    slideshow.content_depth = payload.content_depth
    slideshow.timer_enabled = payload.timer_enabled
    slideshow.strict_mode = payload.strict_mode
    db.commit()
    db.refresh(slideshow)
    return _slideshow_out(slideshow)


@router.patch("/slideshows/{slideshow_id}/progress", response_model=SlideshowOut)
def update_progress(slideshow_id: int, payload: ProgressUpdate, db: Session = Depends(get_db)):
    slideshow = db.get(Slideshow, slideshow_id)
    if not slideshow:
        raise HTTPException(status_code=404, detail="Slideshow not found")
    slideshow.current_slide_index = payload.current_slide_index
    db.commit()
    db.refresh(slideshow)
    return _slideshow_out(slideshow)


@router.delete("/slideshows/{slideshow_id}", status_code=204)
def delete_slideshow(slideshow_id: int, db: Session = Depends(get_db)):
    slideshow = db.get(Slideshow, slideshow_id)
    if not slideshow:
        raise HTTPException(status_code=404, detail="Slideshow not found")
    db.delete(slideshow)
    db.commit()
    shutil.rmtree(STORAGE_PATH / "slideshows" / str(slideshow_id), ignore_errors=True)
