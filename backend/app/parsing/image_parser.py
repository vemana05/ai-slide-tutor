from pathlib import Path

from app.config import STORAGE_PATH


def parse_images(image_paths: list[Path], image_dir: Path) -> list[dict]:
    """One slide per uploaded image file, in upload order.

    No text extraction here — reading text/annotations off a raw photo
    needs a vision-model pass, which comes later (Section 3.2's annotation
    handling step), not this no-AI parsing step.
    """
    slides = []
    for path in image_paths:
        stored_path = image_dir / path.name
        slides.append(
            {
                "raw_text": None,
                "speaker_notes": None,
                "rendered_image_path": stored_path.relative_to(STORAGE_PATH).as_posix(),
                "embedded_image_paths": [],
            }
        )
    return slides
