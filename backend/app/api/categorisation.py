# app/api/categorisation.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.db import get_db
from app.models import categorisation_models, db_models

router = APIRouter(tags=["categorisation"])


class PosteCategInput(BaseModel):
    centre_poste_id: int
    poste_id: int
    poste_label: str
    type_poste: str
    effectif_actuel: int
    etp_calcule: float
    etp_arrondi: int
    total_heures: float
    ecart: int


class SaveCategSimulationInput(BaseModel):
    centre_id: int
    simulation_id: int = None
    commentaire: str = None
    total_etp_calcule: float
    total_etp_arrondi: int
    total_heures: float
    postes: List[PosteCategInput]


@router.post("/categorisation/save-simulation")
def save_categorisation_simulation(
    input: SaveCategSimulationInput,
    db: Session = Depends(get_db)
):
    """
    Sauvegarde les résultats d'une simulation pour la catégorisation.
    Appelé automatiquement après chaque simulation dans Vue Centre.
    """
    try:
        # 1. Créer l'enregistrement principal
        categ_sim = categorisation_models.CategorisationSimulation(
            centre_id=input.centre_id,
            simulation_id=input.simulation_id,
            commentaire=input.commentaire,
            total_etp_calcule=input.total_etp_calcule,
            total_etp_arrondi=input.total_etp_arrondi,
            total_heures=input.total_heures
        )
        db.add(categ_sim)
        db.flush()  # Pour obtenir l'ID
        
        # 2. Sauvegarder les détails par poste
        for p in input.postes:
            poste_detail = categorisation_models.CategorisationPoste(
                categorisation_simulation_id=categ_sim.id,
                centre_poste_id=p.centre_poste_id,
                poste_id=p.poste_id,
                poste_label=p.poste_label,
                type_poste=p.type_poste,
                effectif_actuel=p.effectif_actuel,
                etp_calcule=p.etp_calcule,
                etp_arrondi=p.etp_arrondi,
                total_heures=p.total_heures,
                ecart=p.ecart
        )
            db.add(poste_detail)
        
        db.commit()
        
        return {
            "status": "success",
            "categorisation_simulation_id": categ_sim.id,
            "postes_saved": len(input.postes)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur sauvegarde catégorisation: {str(e)}")


@router.get("/categorisation/latest/{centre_id}")
def get_latest_categorisation_simulation(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère la dernière simulation de catégorisation pour un centre.
    Utilisé par la page Catégorisation pour pré-remplir les données.
    """
    # Récupérer la dernière simulation
    categ_sim = (
        db.query(categorisation_models.CategorisationSimulation)
        .filter(categorisation_models.CategorisationSimulation.centre_id == centre_id)
        .order_by(categorisation_models.CategorisationSimulation.created_at.desc())
        .first()
    )
    
    if not categ_sim:
        return {"found": False, "data": None}
    
    # Récupérer les postes associés
    postes = (
        db.query(categorisation_models.CategorisationPoste)
        .filter(categorisation_models.CategorisationPoste.categorisation_simulation_id == categ_sim.id)
        .all()
    )
    
    return {
        "found": True,
        "data": {
            "id": categ_sim.id,
            "centre_id": categ_sim.centre_id,
            "simulation_id": categ_sim.simulation_id,
            "created_at": categ_sim.created_at.isoformat() if categ_sim.created_at else None,
            "commentaire": categ_sim.commentaire,
            "total_etp_calcule": categ_sim.total_etp_calcule,
            "total_etp_arrondi": categ_sim.total_etp_arrondi,
            "total_heures": categ_sim.total_heures,
            "postes": [
                {
                    "centre_poste_id": p.centre_poste_id,
                    "poste_id": p.poste_id,
                    "poste_label": p.poste_label,
                    "type_poste": p.type_poste,
                    "effectif_actuel": p.effectif_actuel,
                    "etp_calcule": p.etp_calcule,
                    "etp_arrondi": p.etp_arrondi,
                    "total_heures": p.total_heures,
                    "ecart": p.ecart
                }
                for p in postes
            ]
        }
    }
