"""
API Router pour l'analyse d'adéquation des effectifs
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/centres", tags=["adequation"])


# ========== SCHEMAS ==========

class PositionAdequation(BaseModel):
    """Données d'adéquation pour une position"""
    poste: str
    effectif_actuel: int
    effectif_calcule: int
    effectif_recommande: int
    dossiers_mois: float
    dossiers_par_jour: float
    volume_activites_par_heure_total: float

    class Config:
        from_attributes = True


class AdequationResponse(BaseModel):
    """Réponse complète pour l'analyse d'adéquation"""
    centre_id: int
    centre_label: str
    positions: List[PositionAdequation]

    class Config:
        from_attributes = True


# ========== ENDPOINTS ==========

@router.get("/{centre_id}/adequation", response_model=AdequationResponse)
async def get_adequation(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère les données d'adéquation pour un centre spécifique
    
    Cette endpoint retourne:
    - Les effectifs actuels, calculés et recommandés par poste
    - Les volumes (dossiers/mois, dossiers/jour, volume/heure) par poste
    
    Le frontend calcule ensuite:
    - Les indices d'adéquation (calc vs actuel, reco vs actuel, reco vs calc)
    - Les volumes moyens par effectif
    - Les totaux et moyennes globales
    """
    from app.models.centre import Centre
    from app.models.poste import Poste
    
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    # Récupérer tous les postes du centre
    postes = db.query(Poste).filter(Poste.centre_id == centre_id).all()
    
    if not postes:
        raise HTTPException(
            status_code=404, 
            detail=f"Aucun poste trouvé pour le centre {centre_id}"
        )
    
    positions = []
    
    for poste in postes:
        # Récupérer l'effectif actuel (statutaire + APS)
        effectif_statutaire = poste.effectif_statutaire or 0
        effectif_aps = poste.effectif_aps or 0
        effectif_actuel = effectif_statutaire + effectif_aps
        
        # Récupérer les données de simulation (si disponibles)
        # Ces données proviennent de la dernière simulation effectuée
        effectif_calcule = getattr(poste, 'etp_calcule', 0) or 0
        effectif_recommande = getattr(poste, 'etp_arrondi', 0) or 0
        
        # Récupérer les volumes
        # Note: Ces valeurs doivent être calculées/agrégées depuis les tâches
        # Pour l'instant, on utilise des valeurs par défaut
        # TODO: Implémenter le calcul réel des volumes depuis les tâches
        dossiers_mois = getattr(poste, 'volume_mensuel', 0) or 0
        dossiers_par_jour = getattr(poste, 'volume_journalier', 0) or 0
        volume_heure = getattr(poste, 'volume_horaire', 0) or 0
        
        positions.append(
            PositionAdequation(
                poste=poste.label or f"Poste {poste.id}",
                effectif_actuel=int(effectif_actuel),
                effectif_calcule=int(effectif_calcule),
                effectif_recommande=int(effectif_recommande),
                dossiers_mois=float(dossiers_mois),
                dossiers_par_jour=float(dossiers_par_jour),
                volume_activites_par_heure_total=float(volume_heure)
            )
        )
    
    return AdequationResponse(
        centre_id=centre_id,
        centre_label=centre.label or centre.name or f"Centre {centre_id}",
        positions=positions
    )


@router.get("/{centre_id}/adequation/calcul-volumes")
async def calculer_volumes_adequation(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Calcule les volumes à partir des tâches pour l'analyse d'adéquation
    
    Cette endpoint peut être appelée pour recalculer les volumes
    avant d'afficher la page d'adéquation.
    """
    from app.models.centre import Centre
    from app.models.poste import Poste
    from app.models.tache import Tache
    
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    # Récupérer les tâches du centre
    taches = db.query(Tache).filter(Tache.centre_id == centre_id).all()
    
    # Calculer les volumes par poste
    volumes_par_poste = {}
    
    for tache in taches:
        poste_id = tache.poste_id
        if poste_id not in volumes_par_poste:
            volumes_par_poste[poste_id] = {
                "volume_mensuel": 0,
                "volume_journalier": 0,
                "volume_horaire": 0,
                "nb_taches": 0
            }
        
        # Agréger les volumes
        # Note: Adapter selon la structure réelle de vos tâches
        volume_tache = getattr(tache, 'volume', 0) or 0
        volumes_par_poste[poste_id]["volume_mensuel"] += volume_tache
        volumes_par_poste[poste_id]["volume_journalier"] += volume_tache / 22  # ~22 jours ouvrés
        volumes_par_poste[poste_id]["volume_horaire"] += volume_tache / (22 * 8)  # 8h/jour
        volumes_par_poste[poste_id]["nb_taches"] += 1
    
    return {
        "centre_id": centre_id,
        "volumes_par_poste": volumes_par_poste,
        "total_taches": len(taches)
    }
