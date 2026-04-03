from __future__ import annotations
import io
import mimetypes
import os
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
from app.core.config import settings

router = APIRouter(prefix="/recommande/schema-process", tags=["schema-process-recommande"])

def _resolve_path(raw_value: Optional[str]) -> Optional[Path]:
    if not raw_value:
        return None
    candidate = Path(raw_value.strip())
    if not candidate.name:
        return None

    # Check assets directory
    resolved = settings.assets_dir / candidate.name
    if resolved.exists() and resolved.is_file():
        return resolved.resolve()
    
    # Check absolute or relative to cwd
    if candidate.is_absolute():
        if candidate.exists():
            return candidate.resolve()
    else:
        resolved = Path.cwd() / candidate
        if resolved.exists():
            return resolved.resolve()
            
    return None

def _guess_media_type(path: str) -> str:
    media_type, _ = mimetypes.guess_type(path)
    return media_type or "application/octet-stream"

@router.get("")
def get_schema_manifest():
    path = _resolve_path(settings.SCHEMA_REC)
    if not path:
        raise HTTPException(
            status_code=404,
            detail=f"Image schema recommandé introuvable ({settings.SCHEMA_REC})."
        )
    
    return {
        "images": [
            {
                "id": "0",
                "filename": path.name,
                "url": "/api/recommande/schema-process/image",
                "download_url": "/api/recommande/schema-process/image/download"
            }
        ]
    }

@router.get("/image")
def get_schema_image():
    path = _resolve_path(settings.SCHEMA_REC)
    if not path:
        raise HTTPException(status_code=404, detail="Image introuvable")
    return FileResponse(str(path), media_type=_guess_media_type(str(path)))

@router.get("/image/download")
def download_schema_image():
    path = _resolve_path(settings.SCHEMA_REC)
    if not path:
        raise HTTPException(status_code=404, detail="Image introuvable")

    try:
        with Image.open(path) as img:
            png_buffer = io.BytesIO()
            img.save(png_buffer, format="PNG")
            png_buffer.seek(0)

        filename = f"{path.stem}.png"
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(png_buffer, media_type="image/png", headers=headers)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export de l'image: {exc}")
