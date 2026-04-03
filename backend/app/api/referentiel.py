from __future__ import annotations

import io
import mimetypes
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image

from app.core.config import settings

REF_ENV_KEYS = ["REF1", "REF2"]
LOGO_ENV_MAP = {
    "barid": "LOGO_BARID",
    "almav": "LOGO_ALMAV",
    "app": "LOGO_APP",
}


def _resolve_path(raw_value: Optional[str]) -> Optional[Path]:
    if not raw_value:
        return None
    candidate = Path(raw_value.strip())
    if not candidate.name:
        return None

    # 1. Check in assets directory (priority)
    resolved = settings.assets_dir / candidate.name
    if resolved.exists() and resolved.is_file():
        return resolved.resolve()

    # 2. Absolute path check
    if candidate.is_absolute() and candidate.exists():
        return candidate.resolve()

    return None


def _collect_images() -> List[Dict[str, str]]:
    images: List[Dict[str, str]] = []
    idx = 0
    for env_key in REF_ENV_KEYS:
        path = _resolve_path(os.getenv(env_key))
        if not path:
            continue
        images.append(
            {
                "id": str(idx),
                "filename": path.name,
                "path": str(path),
            }
        )
        idx += 1
    return images


def _collect_logo_urls() -> Dict[str, str]:
    urls: Dict[str, str] = {}
    for name, env_key in LOGO_ENV_MAP.items():
        if _resolve_path(os.getenv(env_key)):
            urls[name] = f"/api/assets/logo/{name}"
    return urls


def _find_image(image_id: str) -> Optional[Dict[str, str]]:
    return next((img for img in _collect_images() if img["id"] == image_id), None)


def _guess_media_type(path: str) -> str:
    media_type, _ = mimetypes.guess_type(path)
    return media_type or "application/octet-stream"


def _stream_png(path: str) -> io.BytesIO:
    buf = io.BytesIO()
    try:
        with Image.open(path) as img:
            img = img.convert("RGBA")
            img.save(buf, format="PNG")
    except Exception as exc:
        raise RuntimeError(f"Conversion en PNG impossible : {exc}")
    buf.seek(0)
    return buf


router = APIRouter(prefix="/referentiel", tags=["referentiel"])


@router.get("/manifest")
def manifest():
    images = _collect_images()
    payload: Dict[str, object] = {
        "images": [
            {
                "id": image["id"],
                "filename": image["filename"],
                "url": f"/api/referentiel/image/{image['id']}",
                "download_url": f"/api/referentiel/image/{image['id']}/download",
            }
            for image in images
        ],
        "logos": _collect_logo_urls(),
    }
    if not images:
        payload["error"] = (
            "Aucune image trouvée dans Ref1/Ref2. "
            "Vérifiez que les variables d'environnement REF1 et REF2 "
            "pointent vers des fichiers valides."
        )
    if "app" in payload["logos"]:
        payload["favicon"] = payload["logos"]["app"]
    return payload


@router.get("/image/{image_id}")
def get_image(image_id: str):
    image = _find_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image introuvable")
    return FileResponse(image["path"], media_type=_guess_media_type(image["path"]))


@router.get("/image/{image_id}/download")
def download_image(image_id: str):
    image = _find_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image introuvable")
    try:
        png_buffer = _stream_png(image["path"])
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    headers = {
        "Content-Disposition": f'attachment; filename="{Path(image["filename"]).stem}.png"',
        "Content-Type": "image/png",
    }
    return StreamingResponse(png_buffer, headers=headers, media_type="image/png")
