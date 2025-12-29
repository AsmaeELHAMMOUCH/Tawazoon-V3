from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.directions import DirectionOut
from app.schemas.direction_sim import DirectionSimRequest, DirectionSimResponse
from app.services.direction_service import process_direction_simulation
import traceback
from fastapi import HTTPException

router = APIRouter(tags=["directions"])

@router.post("/simulation/direction", response_model=DirectionSimResponse)
def simulate_direction_advanced(payload: DirectionSimRequest, db: Session = Depends(get_db)):
    try:
        return process_direction_simulation(db, payload)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()  # ✅ affichera tout dans la console
        raise HTTPException(status_code=500, detail=f"Internal error: {repr(e)}")

@router.get("/directions", response_model=List[DirectionOut])
def list_directions(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, label, region_id
        FROM dbo.directions
        WHERE label IS NOT NULL
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/directions/{direction_id}/centres")
def centres_by_direction(direction_id: int, db: Session = Depends(get_db)):
    """
    Centres rattachés à la direction + KPI par centre.
    """
    sql = """
         WITH stats AS (
            SELECT
                cp.centre_id,
                COUNT(*) AS nb_postes,
                SUM(COALESCE(cp.effectif_actuel, 0)) AS fte_actuel,
                MAX(CASE WHEN UPPER(LTRIM(RTRIM(p.type_poste))) = 'MOI' THEN 1 ELSE 0 END) AS has_moi,
                MAX(CASE WHEN UPPER(LTRIM(RTRIM(p.type_poste))) = 'MOD' THEN 1 ELSE 0 END) AS has_mod
            FROM dbo.centre_postes cp
            INNER JOIN dbo.postes p ON p.id = cp.poste_id
            GROUP BY cp.centre_id
        )
        SELECT
            c.id,
            c.label,
            c.region_id,
            c.categorie_id,
            COALESCE(s.nb_postes, 0) AS postes,
            CASE
                WHEN COALESCE(s.has_moi,0)=1 AND COALESCE(s.has_mod,0)=1 THEN 'MOI/MOD'
                WHEN COALESCE(s.has_moi,0)=1 THEN 'MOI'
                WHEN COALESCE(s.has_mod,0)=1 THEN 'MOD'
                ELSE ''
            END AS type,
            COALESCE(s.fte_actuel, 0) AS fte_actuel
        FROM dbo.centres c
        INNER JOIN dbo.directions d ON d.id = :dir_id
        LEFT JOIN stats s ON s.centre_id = c.id
        WHERE
            (c.direction_id = d.id)
            OR (
                (c.direction_id IS NULL OR c.direction_id = 0)
                AND c.region_id = d.region_id
            )
        ORDER BY c.label;
    """
    rows = db.execute(text(sql), {"dir_id": direction_id}).mappings().all()
    return [dict(r) for r in rows]