"""
API endpoints pour la gestion des volumes de simulation (nouvelle architecture Flux/Sens/Segment)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.schemas.models import BulkVolumeUpsertRequest, VolumeItem
from app.services.volume_service import (
    upsert_volumes_bulk,
    calculate_heures_necessaires,
    calculate_etp,
    import_centre_volumes_ref
)
from typing import Dict, List

router = APIRouter(prefix="/api/volumes", tags=["volumes"])


@router.post("/bulk-upsert")
def bulk_upsert_volumes(
    request: BulkVolumeUpsertRequest,
    db: Session = Depends(get_db)
) -> Dict:
    """
    Upsert bulk de volumes pour une simulation.
    
    Body:
    {
        "simulation_id": 2,
        "centre_poste_id": 8288,
        "volumes": [
            {"flux_id": 1, "sens_id": 1, "segment_id": 1, "volume": 50000},
            {"flux_id": 2, "sens_id": 1, "segment_id": 2, "volume": 120},
            ...
        ]
    }
    
    Returns:
        Statistiques d'insertion/mise à jour
    """
    
    try:
        # Valider que tous les volumes ont le même centre_poste_id
        for v in request.volumes:
            if v.centre_poste_id != request.centre_poste_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Incohérence: volume avec centre_poste_id={v.centre_poste_id} != {request.centre_poste_id}"
                )
        
        # Upsert
        stats = upsert_volumes_bulk(
            db=db,
            simulation_id=request.simulation_id,
            centre_poste_id=request.centre_poste_id,
            volumes=request.volumes
        )
        
        return {
            "success": True,
            "simulation_id": request.simulation_id,
            "centre_poste_id": request.centre_poste_id,
            "stats": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calculate/{simulation_id}")
def calculate_simulation_results(
    simulation_id: int,
    centre_poste_id: int = None,
    capacite_nette_h_j: float = 8.0,
    productivite_pct: float = 100.0,
    db: Session = Depends(get_db)
) -> Dict:
    """
    Calcule les heures nécessaires et ETP pour une simulation.
    
    Query params:
        - centre_poste_id: Optionnel, filtrer par centre_poste
        - capacite_nette_h_j: Heures nettes par jour (défaut 8.0)
        - productivite_pct: Productivité en % (défaut 100.0)
        
    Returns:
        {
            "total_heures": 245.5,
            "etp_calcule": 30.69,
            "etp_arrondi": 31,
            "details": [...],
            "warnings": [...]
        }
    """
    
    try:
        # Calculer les heures
        result = calculate_heures_necessaires(
            db=db,
            simulation_id=simulation_id,
            centre_poste_id=centre_poste_id
        )
        
        # Calculer l'ETP
        etp_result = calculate_etp(
            heures_necessaires=result["total_heures"],
            capacite_nette_h_j=capacite_nette_h_j,
            productivite_pct=productivite_pct
        )
        
        return {
            "simulation_id": simulation_id,
            "centre_poste_id": centre_poste_id,
            "total_heures": result["total_heures"],
            "etp_calcule": etp_result["etp_calcule"],
            "etp_arrondi": etp_result["etp_arrondi"],
            "capacite_nette_h_j": capacite_nette_h_j,
            "productivite_pct": productivite_pct,
            "details": result["details"],
            "warnings": result["warnings"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate-direct")
def calculate_direct(
    request: BulkVolumeUpsertRequest,
    capacite_nette_h_j: float = 8.0,
    productivite_pct: float = 100.0,
    db: Session = Depends(get_db)
) -> Dict:
    """
    Upsert + Calcul en une seule requête (pratique pour le frontend).
    
    Body: même que /bulk-upsert
    Query params: capacite_nette_h_j, productivite_pct
    
    Returns: résultats complets (stats + heures + ETP)
    """
    
    try:
        # 1. Upsert
        stats = upsert_volumes_bulk(
            db=db,
            simulation_id=request.simulation_id,
            centre_poste_id=request.centre_poste_id,
            volumes=request.volumes
        )
        
        # 2. Calculer
        result = calculate_heures_necessaires(
            db=db,
            simulation_id=request.simulation_id,
            centre_poste_id=request.centre_poste_id
        )
        
        # 3. ETP
        etp_result = calculate_etp(
            heures_necessaires=result["total_heures"],
            capacite_nette_h_j=capacite_nette_h_j,
            productivite_pct=productivite_pct
        )
        
        return {
            "success": True,
            "simulation_id": request.simulation_id,
            "centre_poste_id": request.centre_poste_id,
            "upsert_stats": stats,
            "total_heures": result["total_heures"],
            "etp_calcule": etp_result["etp_calcule"],
            "etp_arrondi": etp_result["etp_arrondi"],
            "capacite_nette_h_j": capacite_nette_h_j,
            "productivite_pct": productivite_pct,
            "details": result["details"],
            "warnings": result["warnings"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-ref")
def import_volumes_ref(
    volumes: List[Dict],
    db: Session = Depends(get_db)
) -> Dict:
    """
    Importe les volumes de référence (Excel) pour le Niveau National.
    Body: List[Dict] avec clés "Nom du Centre", "Sacs / an", etc.
    """
    try:
        return import_centre_volumes_ref(db, volumes)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
