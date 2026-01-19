# backend/app/api/national.py

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.db import get_db
from app.schemas.direction_sim import VolumeMatriciel, GlobalParams
from app.services.national_simulation_service import process_national_simulation

router = APIRouter(tags=["national"])

class NationalSimRequest(BaseModel):
    """Request pour simulation nationale"""
    mode: str = Field("data_driven", pattern="^(actuel|recommande|database|data_driven)$")
    volumes_matriciels: List[VolumeMatriciel] = []
    global_params: GlobalParams = GlobalParams()

class NationalSimResponse(BaseModel):
    """Response de simulation nationale"""
    centres_simules: int
    directions: List[dict]
    kpis_nationaux: dict

@router.post("/simulation/national", response_model=NationalSimResponse)
def simulate_national(payload: NationalSimRequest, db: Session = Depends(get_db)):
    """
    Lance une simulation nationale avec volumes matriciels.
    
    Args:
        payload: Contient les volumes matriciels et les paramètres globaux
        db: Session de base de données
    
    Returns:
        Résultats agrégés par direction et au niveau national
    """
    print(f"🌍 API: REÇU POST /simulation/national")
    print(f"📦 API: {len(payload.volumes_matriciels)} volumes matriciels")
    
    result = process_national_simulation(
        db=db,
        volumes_matriciels=payload.volumes_matriciels,
        global_params={
            "productivite": payload.global_params.productivite,
            "heures_par_jour": payload.global_params.heures_par_jour,
            "idle_minutes": payload.global_params.idle_minutes,
            "taux_complexite": payload.global_params.taux_complexite,
            "nature_geo": payload.global_params.nature_geo
        }
    )
    
    return result
