from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.simuler_centre_par_type import (
    SimulerCentreParTypeRequest,
    SimulerCentreParTypeResponse,
)
from app.services.simuler_centre_par_type import simuler_centre_par_type_service

router = APIRouter(tags=["simulation"])

@router.post("/simuler-centre-par-type", response_model=SimulerCentreParTypeResponse)
def simuler_centre_par_type(
    payload: SimulerCentreParTypeRequest, db: Session = Depends(get_db)
):
    try:
        return simuler_centre_par_type_service(db, payload)
    except Exception as e:
        # log stacktrace in real code
        raise HTTPException(status_code=500, detail=f"simuler-centre-par-type failed: {e}")
