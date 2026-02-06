"""
CCP (Centre de Courrier Postal) API Endpoints

This module provides dedicated API endpoints for CCP simulation.
All CCP-related endpoints are grouped here for clean separation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from app.core.db import get_db
from app.services.simulation_CCP import (
    calculate_ccp_simulation,
    get_ccp_postes,
    load_ccp_tasks
)

router = APIRouter(prefix="/ccp", tags=["CCP"])


# ==================== REQUEST/RESPONSE MODELS ====================

class CCPSimulationRequest(BaseModel):
    """Request model for CCP simulation"""
    centre_id: int = 1962  # Default CCP center ID
    poste_id: Optional[int] = None
    volumes: Dict[str, Any]
    params: Dict[str, Any]
    
    class Config:
        json_schema_extra = {
            "example": {
                "centre_id": 1962,
                "poste_id": 123,
                "volumes": {
                    "courrier_ordinaire": 1000000,
                    "courrier_recommande": 500000,
                    "ebarkia": 200000,
                    "lrh": 100000,
                    "amana": 50000
                },
                "params": {
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
def simulate_ccp(
    request: CCPSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    CCP-specific simulation endpoint
    
    **Purpose**: Calculate workforce requirements for CCP center
    
    **Endpoint**: POST /api/ccp/simulate
    
    **Request Body**:
    - centre_id: CCP center ID (default: 2053)
    - poste_id: Optional position ID (null = all positions)
    - volumes: Annual volume inputs
        - courrier_ordinaire: Annual CO volume
        - courrier_recommande: Annual CR volume
        - ebarkia: Annual EB volume
        - lrh: Annual LRH volume
        - amana: Annual AMANA volume
    - params: Simulation parameters
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
        print(f"🔵 [CCP API] Simulation request for centre {request.centre_id}, poste {request.poste_id}")
        
        result = calculate_ccp_simulation(
            db=db,
            centre_id=request.centre_id,
            poste_id=request.poste_id,
            volumes=request.volumes,
            params=request.params
        )
        
        print(f"✅ [CCP API] Simulation completed: {result.fte_arrondi} FTE")
        return result
        
    except Exception as e:
        print(f"❌ [CCP API] Simulation error: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"CCP simulation failed: {str(e)}")


@router.get("/postes")
def get_ccp_positions(
    centre_id: int = 1962,
    db: Session = Depends(get_db)
):
    try:
        print(f"🔵 [CCP API] Fetching positions for centre {centre_id}")
        
        postes = get_ccp_postes(db, centre_id)
        
        print(f"✅ [CCP API] Found {len(postes)} positions")
        return {"postes": postes}
        
    except Exception as e:
        print(f"❌ [CCP API] Error fetching positions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CCP positions: {str(e)}")


@router.get("/referentiel")
def get_ccp_referentiel(
    centre_id: int = 1962,
    poste_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    try:
        print(f"🔵 [CCP API] Fetching referentiel for centre {centre_id}, poste {poste_id}")
        
        tasks = load_ccp_tasks(db, centre_id, poste_id)
        
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
        
        print(f"✅ [CCP API] Found {len(referentiel)} tasks")
        return {"referentiel": referentiel}
        
    except Exception as e:
        print(f"❌ [CCP API] Error fetching referentiel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch CCP referentiel: {str(e)}")


@router.get("/health")
def ccp_health_check():
    """
    Health check endpoint for CCP module
    
    **Purpose**: Verify CCP API is running
    
    **Endpoint**: GET /api/ccp/health
    """
    return {
        "status": "healthy",
        "module": "CCP",
        "description": "Centre de Courrier Postal API"
    }
