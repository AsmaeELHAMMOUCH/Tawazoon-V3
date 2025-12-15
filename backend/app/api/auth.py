from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.exc import ProgrammingError
from app.core.db import get_db
from ..core.security import create_access_token_for_user, verify_token

router = APIRouter(tags=["auth"])

class LoginRequest(BaseModel):
    # Accepte soit username soit email
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

def _fetch_user_by_username(db: Session, username: str) -> Optional[Dict[str, Any]]:
    """
    Récupère un utilisateur par username. Adapte la requête selon ton SGBD.
    Ici, le placeholder '?' suggère SQLite.
    """
    row = db.execute(
        text("select id, username, password from users where username = :username"),
        {"username": username},
    ).mappings().first()
    if not row:
        return None
    return {
        "username": row["username"],
        "password_hash": row["password"],
    }

def _verify_user(db: Session, login_id: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Valide le mot de passe et retourne le profil utilisateur canonique si succès.
    Supporte la saisie d'un email en utilisant la partie locale comme candidat username.
    """
    import bcrypt  # lazy import
    try:
        candidates: list[str] = []
        login_id = (login_id or "").strip()
        if login_id:
            candidates.append(login_id)
            if "@" in login_id:
                local = login_id.split("@", 1)[0].strip()
                if local and local not in candidates:
                    candidates.append(local)
        # Essaie chaque candidat comme username
        for candidate in candidates:
            try:
                user = _fetch_user_by_username(db, candidate)
            except Exception:
                user = None
            if not user:
                continue
            stored_hash = user["password_hash"]
            # Comparaison bcrypt
            try:
                if isinstance(stored_hash, bytes):
                    ok = bcrypt.checkpw(password.encode("utf-8"), stored_hash)
                else:
                    ok = bcrypt.checkpw(password.encode("utf-8"), str(stored_hash).encode("utf-8"))
            except Exception:
                ok = False
            if ok:
                # Retire le hash avant de renvoyer
                user.pop("password_hash", None)
                return user
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur base de donnees: {e}")

@router.post("/login", include_in_schema=True, summary="Login (JSON)")
async def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    """Accepts application/json body: { username?, email?, password }"""
    login_id = payload.username or payload.email or ""
    user = _verify_user(db, login_id, payload.password)
    if user:
        token = create_access_token_for_user(user["username"])
        return {
            "success": True,
            "message": "Connexion réussie",
            "username": user["username"],
            "token": token,
            "user": {
                "name": user["username"],
            },
        }
    raise HTTPException(status_code=401, detail="Identifiants invalides")

@router.get("/login", include_in_schema=False)
async def login_get_info():
    raise HTTPException(
        status_code=405,
        detail="Utiliser POST /api/login avec JSON {username|email, password}",
    )

@router.post("/login-form", include_in_schema=True, summary="Login (Form)")
async def login_form(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """Accepts application/x-www-form-urlencoded with fields username/password"""
    user = _verify_user(db, username, password)
    if user:
        token = create_access_token_for_user(user["username"])
        return {
            "success": True,
            "message": "Connexion réussie",
            "username": user["username"],
            "token": token,
            "user": {
                "name": user["username"],
            },
        }
    raise HTTPException(status_code=401, detail="Identifiants invalides")

@router.get("/auth/health", include_in_schema=True)
def auth_health():
    return {"auth": "ok"}

@router.get("/me", summary="Current user", include_in_schema=True)
def me(username: str = Depends(verify_token)):
    return {"user": username}

@router.get("/user/me", summary="Profil utilisateur (frontend)", include_in_schema=True)
def get_user_me(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """
    Retourne les informations de l'utilisateur connecté (depuis le 'sub' du JWT).
    """
    try:
        row = db.execute(
            text("select id, username, password from users WHERE username = :username"),
            {"username": username},
        ).mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        return {
            "name": row["username"],
            "email": row.get("email"),
            "role": row.get("role") or "Utilisateur",
            "avatarUrl": row.get("avatar_url") or "",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du profil : {e}"
        )
