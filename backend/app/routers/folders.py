from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Folder
from app.schemas import FolderCreate, FolderOut, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("", response_model=list[FolderOut])
def list_folders(db: Session = Depends(get_db)):
    folders = db.scalars(select(Folder)).all()
    return [
        FolderOut.model_validate(f, from_attributes=True).model_copy(
            update={"slideshow_count": len(f.slideshows)}
        )
        for f in folders
    ]


@router.post("", response_model=FolderOut, status_code=201)
def create_folder(payload: FolderCreate, db: Session = Depends(get_db)):
    folder = Folder(name=payload.name)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderOut.model_validate(folder, from_attributes=True)


@router.get("/{folder_id}", response_model=FolderOut)
def get_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    return FolderOut.model_validate(folder, from_attributes=True).model_copy(
        update={"slideshow_count": len(folder.slideshows)}
    )


@router.patch("/{folder_id}", response_model=FolderOut)
def rename_folder(folder_id: int, payload: FolderUpdate, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    folder.name = payload.name
    db.commit()
    db.refresh(folder)
    return FolderOut.model_validate(folder, from_attributes=True).model_copy(
        update={"slideshow_count": len(folder.slideshows)}
    )


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(folder)
    db.commit()
