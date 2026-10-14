from pathlib import Path

import pymupdf as fitz

from app.config import STORAGE_PATH


def render_pdf_pages(pdf_path: Path, image_dir: Path, filename_prefix: str = "page") -> list[str]:
    """Render every page of a PDF to a PNG, returning paths relative to STORAGE_PATH
    (i.e. usable directly under the /storage static mount)."""
    image_dir.mkdir(parents=True, exist_ok=True)
    paths = []

    doc = fitz.open(pdf_path)
    for page_index, page in enumerate(doc):
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        image_filename = f"{filename_prefix}_{page_index + 1}.png"
        pix.save(image_dir / image_filename)
        relative_dir = (image_dir / image_filename).relative_to(STORAGE_PATH)
        paths.append(relative_dir.as_posix())
    doc.close()

    return paths


def parse_pdf(pdf_path: Path, image_dir: Path) -> list[dict]:
    """Extract one slide per PDF page: raw text + a rendered page image.

    No speaker notes or embedded-image extraction for PDFs — a rendered
    page image already shows everything visually.
    """
    slides = []

    doc = fitz.open(pdf_path)
    texts = [page.get_text().strip() for page in doc]
    doc.close()

    image_paths = render_pdf_pages(pdf_path, image_dir)

    for text, image_path in zip(texts, image_paths):
        slides.append(
            {
                "raw_text": text or None,
                "speaker_notes": None,
                "rendered_image_path": image_path,
                "embedded_image_paths": [],
            }
        )

    return slides
