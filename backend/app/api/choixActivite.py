from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.core.db import get_db
from app.models import Activite  # Modèle SQLAlchemy


class ActiviteResponse(BaseModel):
    id_activite: int
    nom_activite: str
    description: str | None
    code_activite: str


router = APIRouter()


@router.get("/activites", response_model=List[ActiviteResponse])
async def get_activites(db: Session = Depends(get_db)):
    """
    Retourne la liste des activités disponibles.
    """
    try:
        activites = db.query(Activite).all()
        return [
            ActiviteResponse(
                id_activite=a.id_activite,
                nom_activite=a.nom_activite,
                description=a.description,
                code_activite=a.code_activite,
            )
            for a in activites
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des activités: {str(e)}",
        )

