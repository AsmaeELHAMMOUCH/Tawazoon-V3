"""schema_process router for serving manifests and assets."""
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

BASE_DIR = Path(getattr(sys, "_MEIPASS", Path.cwd()))
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE, override=False)
IMAGE_ENV_KEYS = ["SCHEMA_ACTUEL1", "SCHEMA_ACTUEL2"]
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

    search_bases = [
        Path.cwd(),
        Path.cwd() / "assets",
        BASE_DIR,
        Path(__file__).resolve().parents[2] / "assets"
    ]

    for base in search_bases:
        resolved = candidate if candidate.is_absolute() else (base / candidate)
        resolved = resolved.expanduser()
        if resolved.exists() and resolved.is_file():
            return resolved.resolve()
    return None


def _collect_images() -> List[Dict[str, str]]:
    images: List[Dict[str, str]] = []
    idx = 0
    for env_key in IMAGE_ENV_KEYS:
        path = _resolve_path(os.getenv(env_key))
        if path:
            images.append({
                "id": str(idx),
                "filename": path.name,
                "path": str(path),
            })
            idx += 1
    return images


def _collect_logos() -> Dict[str, Optional[str]]:
    logos: Dict[str, Optional[str]] = {}
    for name, env_key in LOGO_ENV_MAP.items():
        resolved = _resolve_path(os.getenv(env_key))
        logos[name] = str(resolved) if resolved else None
    return logos


SCHEMA_IMAGES = _collect_images()
LOGO_PATHS = _collect_logos()

schema_router = APIRouter(prefix="/schema-process", tags=["schema-process"])
assets_router = APIRouter(prefix="/assets/logo", tags=["schema-assets"])


@schema_router.get("/manifest")
def manifest():
    if not SCHEMA_IMAGES:
        raise HTTPException(
            status_code=404,
            detail="Aucune image trouvée dans les variables d'environnement (SCHEMA_ACTUEL1, SCHEMA_ACTUEL2).",
        )

    payload = {
        "images": [
            {
                "id": image["id"],
                "filename": image["filename"],
                "url": f"/api/schema-process/image/{image['id']}",
                "download_url": f"/api/schema-process/image/{image['id']}/download",
            }
            for image in SCHEMA_IMAGES
        ],
        "logos": {
            "barid": "/api/assets/logo/barid",
            "almav": "/api/assets/logo/almav",
        },
    }

    favicon_url = "/api/assets/logo/app" if LOGO_PATHS.get("app") else None
    if favicon_url:
        payload["favicon"] = favicon_url

    return payload


def _find_image(image_id: str) -> Optional[Dict[str, str]]:
    return next((img for img in SCHEMA_IMAGES if img["id"] == image_id), None)


def _guess_media_type(path: str) -> str:
    media_type, _ = mimetypes.guess_type(path)
    return media_type or "application/octet-stream"


@schema_router.get("/image/{image_id}")
def get_image(image_id: str):
    image = _find_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image introuvable")
    return FileResponse(image["path"], media_type=_guess_media_type(image["path"]))


@schema_router.get("/image/{image_id}/download")
def download_image(image_id: str):
    image = _find_image(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image introuvable")

    try:
        with Image.open(image["path"]) as img:
            png_buffer = io.BytesIO()
            img.save(png_buffer, format="PNG")
            png_buffer.seek(0)

        filename = f"{Path(image['filename']).stem}.png"
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(png_buffer, media_type="image/png", headers=headers)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la conversion de l'image: {exc}")


@assets_router.get("/{name}")
def get_logo(name: str):
    if name not in LOGO_ENV_MAP:
        raise HTTPException(status_code=404, detail="Logo non supporté")

    raw_path = _resolve_path(os.getenv(LOGO_ENV_MAP[name]))
    if not raw_path:
        raise HTTPException(status_code=404, detail="Logo introuvable")

    return FileResponse(str(raw_path), media_type=_guess_media_type(str(raw_path)))
