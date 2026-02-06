"""
CCI (Centre Colis International) API Endpoints
Centre ID: 1952

This module provides dedicated API endpoints for CCI simulation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from app.core.db import get_db
from app.services.simulation_CCI import (
    calculate_cci_simulation,
    get_cci_postes,
    load_cci_tasks
)

router = APIRouter(prefix="/cci", tags=["CCI"])


# ==================== REQUEST/RESPONSE MODELS ====================

class CCISimulationRequest(BaseModel):
    """Request model for CCI simulation"""
    centre_id: int = 1952
    poste_id: Optional[int] = None
    volumes_ui: List[Dict[str, Any]] = [] # Flexible UI inputs
    
    # Specific Parameters
    productivite: float = 100.0
    idle_minutes: float = 0.0
    
    # Legacy/Specific Params
    nbr_courrier_liasse: Optional[float] = 500.0
    nb_courrier_liasse_co: Optional[float] = 500.0
    nb_courrier_liasse_cr: Optional[float] = 500.0
    
    pct_retour: Optional[float] = 0.0
    pct_retour_co: Optional[float] = 0.0
    pct_retour_cr: Optional[float] = 0.0
    
    courriers_par_sac: Optional[float] = 2500.0
    courriers_co_par_sac: Optional[float] = 2500.0
    courriers_cr_par_sac: Optional[float] = 500.0
    
    annotes: Optional[float] = 0.0
    annotes_co: Optional[float] = 0.0
    annotes_cr: Optional[float] = 0.0
    
    pct_reclamation: Optional[float] = 0.0
    pct_reclam_co: Optional[float] = 0.0
    pct_reclam_cr: Optional[float] = 0.0

    class Config:
        json_schema_extra = {
            "example": {
                "centre_id": 1952,
                "productivite": 100,
                "volumes_ui": [
                    {"flux": "CO", "sens": "IMPORT", "volume": 10000},
                    {"flux": "CO", "sens": "EXPORT", "volume": 5000}
                ]
            }
        }


# ==================== ENDPOINTS ====================

@router.post("/simulate")
def simulate_cci(
    request: CCISimulationRequest,
    db: Session = Depends(get_db)
):
    """
    CCI-specific simulation endpoint
    """
    try:
        print(f"🔵 [CCI API] Simulation request for centre {request.centre_id}")
        
        # Adapt request model to what calculate_cci_simulation expects (SimulationRequest)
        # We need to map the flat CCISimulationRequest back to the generic SimulationRequest structure
        # OR update calculate_cci_simulation to take this model.
        # Ideally, we construct a SimulationRequest object here.
        
        from app.schemas.models import SimulationRequest as CoreSimulationRequest, VolumeItemUI
        
        # Map volumes list dict to VolumeItemUI objects
        volumes_ui_objs = [VolumeItemUI(**v) for v in request.volumes_ui]
        
        core_request = CoreSimulationRequest(
            centre_id=request.centre_id,
            poste_id=request.poste_id,
            productivite=request.productivite,
            idle_minutes=request.idle_minutes,
            volumes_ui=volumes_ui_objs,
            
            # Pass all specific params
            nbr_courrier_liasse=request.nbr_courrier_liasse,
            nb_courrier_liasse_co=request.nb_courrier_liasse_co,
            nb_courrier_liasse_cr=request.nb_courrier_liasse_cr,
            
            pct_retour=request.pct_retour,
            pct_retour_co=request.pct_retour_co,
            pct_retour_cr=request.pct_retour_cr,
            
            courriers_par_sac=request.courriers_par_sac,
            courriers_co_par_sac=request.courriers_co_par_sac,
            courriers_cr_par_sac=request.courriers_cr_par_sac,
            
            annotes=request.annotes,
            annotes_co=request.annotes_co,
            annotes_cr=request.annotes_cr,
            
            pct_reclamation=request.pct_reclamation,
            pct_reclam_co=request.pct_reclam_co,
            pct_reclam_cr=request.pct_reclam_cr
        )
        
        result = calculate_cci_simulation(db, core_request)
        
        print(f"✅ [CCI API] Simulation completed: {result.fte_arrondi} FTE")
        return result
        
    except Exception as e:
        print(f"❌ [CCI API] Simulation error: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"CCI simulation failed: {str(e)}")


@router.get("/postes")
def get_cci_positions(
    centre_id: int = 1952,
    db: Session = Depends(get_db)
):
    try:
        postes = get_cci_postes(db, centre_id)
        return {"postes": postes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CCI positions: {str(e)}")


@router.get("/referentiel")
def get_cci_referentiel(
    centre_id: int = 1952,
    poste_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        tasks = load_cci_tasks(db, centre_id, poste_id)
        
        referentiel = [
            {
                "id": t.get("id"),
                "task": t.get("nom_tache"),
                "t": t.get("nom_tache"),
                "famille": t.get("famille_uo", ""),
                "ph": t.get("phase", ""),
                "u": t.get("unite_mesure", ""),
                "m": float(t.get("moyenne_min", 0)),
                "etat": "A"
            }
            for t in tasks
        ]
        
        return {"referentiel": referentiel}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CCI referentiel: {str(e)}")


@router.get("/health")
def cci_health_check():
    return {
        "status": "healthy",
        "module": "CCI",
        "description": "Centre Colis International API"
    }
