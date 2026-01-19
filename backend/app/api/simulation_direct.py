# app/api/simulation_direct.py
"""
API endpoints pour la simulation directe (sans VolumeSimulation).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.db import get_db
from app.schemas.volumes_ui import VolumesUIInput
from app.schemas.models import SimulationResponse
from app.services.simulation_direct import calculer_simulation_direct, calculer_simulation_multi_centres
from app.models.db_models import CentrePoste

router = APIRouter(prefix="/api/simulation-direct", tags=["Simulation Direct"])


@router.post("/intervenant/{centre_poste_id}", response_model=SimulationResponse)
def simulate_intervenant_direct(
    centre_poste_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    debug: bool = True,
    db: Session = Depends(get_db)
):
    """
    Simulation directe pour un intervenant (centre/poste).
    
    Args:
        centre_poste_id: ID du centre/poste
        volumes_ui: Volumes UI saisis (annuels)
        productivite: Productivité en % (défaut: 100%)
        heures_par_jour: Heures de travail par jour (défaut: 8h)
        idle_minutes: Marge d'inactivité en minutes/jour (défaut: 0)
        debug: Activer les logs de debug (défaut: True)
    
    Returns:
        SimulationResponse avec les résultats
    """
    
    # Vérifier que le centre/poste existe
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        raise HTTPException(status_code=404, detail=f"Centre/Poste {centre_poste_id} non trouvé")
    
    try:
        result = calculer_simulation_direct(
            db=db,
            centre_poste_id=centre_poste_id,
            volumes_ui=volumes_ui,
            productivite=productivite,
            heures_par_jour=heures_par_jour,
            idle_minutes=idle_minutes,
            debug=debug
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la simulation: {str(e)}")


@router.post("/centre/{centre_id}", response_model=SimulationResponse)
def simulate_centre_direct(
    centre_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    debug: bool = False,
    db: Session = Depends(get_db)
):
    """
    Simulation directe pour un centre (tous les postes du centre).
    
    Args:
        centre_id: ID du centre
        volumes_ui: Volumes UI saisis (annuels)
        productivite: Productivité en % (défaut: 100%)
        heures_par_jour: Heures de travail par jour (défaut: 8h)
        idle_minutes: Marge d'inactivité en minutes/jour (défaut: 0)
        debug: Activer les logs de debug (défaut: False)
    
    Returns:
        SimulationResponse avec les résultats agrégés
    """
    
    # Récupérer tous les centre/postes du centre
    centre_postes = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
    if not centre_postes:
        raise HTTPException(status_code=404, detail=f"Aucun poste trouvé pour le centre {centre_id}")
    
    centre_poste_ids = [cp.id for cp in centre_postes]
    
    try:
        result = calculer_simulation_multi_centres(
            db=db,
            centre_poste_ids=centre_poste_ids,
            volumes_ui=volumes_ui,
            productivite=productivite,
            heures_par_jour=heures_par_jour,
            idle_minutes=idle_minutes,
            debug=debug
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la simulation: {str(e)}")


@router.get("/test-mapping/{centre_poste_id}")
def test_volume_mapping(
    centre_poste_id: int,
    db: Session = Depends(get_db)
):
    """
    Endpoint de test pour vérifier le mapping des volumes.
    Retourne les informations de mapping pour toutes les tâches d'un centre/poste.
    """
    from app.services.volume_mapper import VolumeMapper
    from app.models.db_models import Tache
    
    # Créer un mapper
    mapper = VolumeMapper(db)
    
    # Récupérer les tâches
    taches = db.query(Tache).filter(Tache.centre_poste_id == centre_poste_id).all()
    
    if not taches:
        raise HTTPException(status_code=404, detail=f"Aucune tâche trouvée pour le centre/poste {centre_poste_id}")
    
    # Construire les informations de mapping
    mappings = []
    for tache in taches:
        flux_code = mapper.get_flux_code(tache.flux_id)
        sens_code = mapper.get_sens_code(tache.sens_id)
        segment_code = mapper.get_segment_code(tache.segment_id)
        
        mappings.append({
            "tache_id": tache.id,
            "nom_tache": tache.nom_tache,
            "unite_mesure": tache.unite_mesure,
            "moyenne_min": tache.moyenne_min,
            "flux_id": tache.flux_id,
            "flux_code": flux_code,
            "sens_id": tache.sens_id,
            "sens_code": sens_code,
            "segment_id": tache.segment_id,
            "segment_code": segment_code,
            "mapping_info": {
                "expected_ui_path": f"{'flux_arrivee' if sens_code == 'ARRIVEE' else 'flux_depart' if sens_code == 'DEPART' else 'guichet'}.{flux_code if flux_code else 'N/A'}.{segment_code if segment_code else 'N/A'}"
            }
        })
    
    return {
        "centre_poste_id": centre_poste_id,
        "total_taches": len(taches),
        "mappings": mappings
    }
