"""API layer for the simulation globale functionality."""
from fastapi import APIRouter, HTTPException

from app.db.connection import DatabaseConnectionError
from app.models.simulation_globale import SimulationGlobaleRequest, SimulationGlobaleResponse
from app.services.simulation_globale_service import run_simulation_globale, SimulationServiceError

router = APIRouter(prefix="/simulation/globale", tags=["Simulation Globale"])


@router.post("/run", response_model=SimulationGlobaleResponse)
def run_simulation_globale_endpoint(request: SimulationGlobaleRequest) -> SimulationGlobaleResponse:
    try:
        payload = run_simulation_globale(request.dict())
        return SimulationGlobaleResponse(**payload)
    except SimulationServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DatabaseConnectionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
