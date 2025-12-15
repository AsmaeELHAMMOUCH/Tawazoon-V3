from fastapi import APIRouter
from sqlalchemy import text, inspect
from app.core.config import settings
from app.core.db import engine
import app.main as app_main
import os

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health")
def health():
    return {"status": "ok"}


@router.get("/health/config", summary="Effective DB Config (redacted)")
def health_config():
    return {
        "driver": settings.DB_DRIVER,
        "server": settings.DB_SERVER,
        "database": settings.DB_NAME,
        "encrypt": settings.ENCRYPT,
        "trustServerCertificate": settings.TRUST,
        "user_present": bool(settings.DB_USER),
        "password_present": bool(settings.DB_PASSWORD),
    }


@router.get("/whoami", summary="Identify running build/module")
def whoami():
    main_file = getattr(app_main, "__file__", None)
    try:
        stat = os.stat(main_file) if main_file else None
        mtime = int(stat.st_mtime) if stat else None
        size = int(stat.st_size) if stat else None
    except Exception:
        mtime = None
        size = None
    return {
        "main_file": main_file,
        "main_mtime": mtime,
        "main_size": size,
        "app_title": getattr(app_main, "app", None).title if getattr(app_main, "app", None) else None,
    }


@router.get("/health/db", summary="DB Details + Ping")
def health_db():
    info = {
        "driver": settings.DB_DRIVER,
        "server": settings.DB_SERVER,
        "database": settings.DB_NAME,
        "encrypt": settings.ENCRYPT,
        "trustServerCertificate": settings.TRUST,
        # redact user/pass; show presence only
        "user_present": bool(settings.DB_USER),
        "password_present": bool(settings.DB_PASSWORD),
    }
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"db": "ok", **info}
    except Exception as e:
        return {"db": "error", "detail": str(e), **info}


@router.get("/health/db/meta", summary="DB Metadata: tables + counts")
def health_db_meta():
    meta = {"tables": {}, "status": "ok"}
    try:
        insp = inspect(engine)
        tables = [
            "regions",
            "centres",
            "postes",
            "centre_postes",
            "taches",
        ]
        with engine.connect() as conn:
            for t in tables:
                exists = insp.has_table(t)
                info = {"exists": exists}
                if exists:
                    try:
                        cnt = conn.execute(text(f"SELECT COUNT(1) FROM {t}")).scalar()
                        info["count"] = int(cnt or 0)
                    except Exception as e:
                        info["count_error"] = str(e)
                meta["tables"][t] = info
        return meta
    except Exception as e:
        meta["status"] = "error"
        meta["detail"] = str(e)
        return meta
