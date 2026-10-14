import subprocess
import tempfile
from pathlib import Path


class SofficeConversionError(RuntimeError):
    pass


def convert_to_pdf(source_path: Path) -> Path:
    """Convert an office document (e.g. .pptx) to PDF via headless LibreOffice.

    Returns the path to the generated PDF inside a temp directory the
    caller is responsible for reading before it goes out of scope.
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="soffice_"))
    result = subprocess.run(
        [
            "soffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmp_dir),
            str(source_path),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    pdf_path = tmp_dir / f"{source_path.stem}.pdf"
    if result.returncode != 0 or not pdf_path.exists():
        raise SofficeConversionError(
            f"soffice conversion failed (code {result.returncode}): {result.stderr or result.stdout}"
        )
    return pdf_path
