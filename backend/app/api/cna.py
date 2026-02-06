"""
CNA (Centre National Amana) API Endpoints

This module provides dedicated API endpoints for CNA simulation.
All CNA-related endpoints are grouped here for clean separation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from app.core.db import get_db
from app.services.simulation_CNA import (
    calculate_cna_simulation,
    get_cna_postes,
    load_cna_tasks
)

router = APIRouter(prefix="/cna", tags=["CNA"])


# ==================== REQUEST/RESPONSE MODELS ====================

class CNASimulationRequest(BaseModel):
    """Request model for CNA simulation"""
    centre_id: int = 1964  # Default CNA center ID
    poste_id: Optional[int] = None
    volumes: Dict[str, Any]
    params: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "centre_id": 1964,
                "poste_id": 123,
                "volumes": {
                    "collecte": 1000000,
                    "marche_ordinaire": 500000,
                    "recu_region": 200000,
                    "global_amana": 1700000
                },
                "params": {
                    "param_collecte": 100,
                    "param_marche_ordinaire": 100,
                    "productivite": 100,
                    "heures_net": 8.0,
                    "idle_minutes": 0,
                    "taux_complexite": 1.0,
                    "nature_geo": 1.0
                }
            }
        }


# ==================== ENDPOINTS ====================

@router.post("/simulate")
def simulate_cna(
    request: CNASimulationRequest,
    db: Session = Depends(get_db)
):
    """
    CNA-specific simulation endpoint
    
    **Purpose**: Calculate workforce requirements for CNA center
    
    **Endpoint**: POST /api/cna/simulate
    
    **Request Body**:
    - centre_id: CNA center ID (default: 1964)
    - poste_id: Optional position ID (null = all positions)
    - volumes: Annual volume inputs
        - collecte: Annual Collecte volume
        - marche_ordinaire: Annual Marche ordinaire volume
        - recu_region: Annual Reçu région volume
        - global_amana: Calculated sum (auto-calculated)
    - params: Simulation parameters
        - param_collecte: Percentage for Collecte (default: 100)
        - param_marche_ordinaire: Percentage for Marche ordinaire (default: 100)
        - productivite: Productivity % (default: 100)
        - heures_net: Net hours/day (default: 8.0)
        - idle_minutes: Idle time in minutes (default: 0)
        - taux_complexite: Complexity coefficient (default: 1.0)
        - nature_geo: Geographic coefficient (default: 1.0)
    
    **Response**:
    - total_heures: Total hours required
    - fte_calcule: Calculated FTE (decimal)
    - fte_arrondi: Rounded FTE (integer)
    - heures_net_jour: Net hours per day
    - details_taches: List of task details with hours
    """
    try:
        print(f"🟢 [CNA API] Simulation request for centre {request.centre_id}, poste {request.poste_id}")
        
        result = calculate_cna_simulation(
            db=db,
            centre_id=request.centre_id,
            poste_id=request.poste_id,
            volumes=request.volumes,
            params=request.params
        )
        
        print(f"✅ [CNA API] Simulation completed: {result.fte_arrondi} FTE")
        return result
        
    except Exception as e:
        print(f"❌ [CNA API] Simulation error: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"CNA simulation failed: {str(e)}")


@router.get("/postes")
def get_cna_positions(
    centre_id: int = 1964,
    db: Session = Depends(get_db)
):
    try:
        print(f"🟢 [CNA API] Fetching positions for centre {centre_id}")
        
        postes = get_cna_postes(db, centre_id)
        
        print(f"✅ [CNA API] Found {len(postes)} positions")
        return {"postes": postes}
        
    except Exception as e:
        print(f"❌ [CNA API] Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CNA positions: {str(e)}")


@router.get("/referentiel")
def get_cna_referentiel(
    centre_id: int = 1964,
    poste_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        print(f"🟢 [CNA API] Fetching referentiel for centre {centre_id}, poste {poste_id}")
        
        tasks = load_cna_tasks(db, centre_id, poste_id)
        
        # Format for frontend
        referentiel = [
            {
                "id": t.get("id"),
                "task": t.get("nom_tache"),
                "t": t.get("nom_tache"),
                "famille": t.get("famille_uo", ""),
                "ph": t.get("phase", ""),
                "u": t.get("unite_mesure", ""),
                "m": float(t.get("moyenne_min", 0)),
                "etat": "A"  # Active
            }
            for t in tasks
        ]
        
        print(f"✅ [CNA API] Found {len(referentiel)} tasks")
        return {"referentiel": referentiel}
        
    except Exception as e:
        print(f"❌ [CNA API] Error fetching referentiel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CNA referentiel: {str(e)}")


@router.get("/health")
def cna_health_check():
    """
    Health check endpoint for CNA module
    
    **Purpose**: Verify CNA API is running
    
    **Endpoint**: GET /api/cna/health
    """
    return {
        "status": "healthy",
        "module": "CNA",
        "description": "Centre National Amana API"
    }
