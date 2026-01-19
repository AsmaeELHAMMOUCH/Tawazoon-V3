from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.directions import DirectionOut
from app.schemas.direction_sim import DirectionSimRequest, DirectionSimResponse
from app.services.direction_service import process_direction_simulation_v2
from app.services.direction_v2_service import process_direction_simulation_v2_clean
import traceback
from fastapi import HTTPException

router = APIRouter(tags=["directions"])
print("⚡ CHARGEMENT MODULE DIRECTIONS (V2 ACTIVE)")

@router.post("/simulation/direction", response_model=DirectionSimResponse)
def simulate_direction_advanced(payload: DirectionSimRequest, db: Session = Depends(get_db)):
    print(f"🚀 API: REÇU POST /simulation/direction - ID={payload.direction_id} Mode={payload.mode}")
    print(f"📦 API: Nombre de volumes reçus: {len(payload.volumes) if payload.volumes else 0}")
    try:
        return process_direction_simulation_v2(db, payload)
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
    
    # Filtrage : On EXCLUT le Siège (SEIGE, SIÈGE)
    results = []
    for r in rows:
        lbl = r['label'].strip().upper()
        if "SEIGE" in lbl or "SIEGE" in lbl or "SIÈGE" in lbl:
            continue
        results.append(dict(r))
    
    return results


@router.get("/directions/{direction_id}/centres")
def centres_by_direction(direction_id: int, db: Session = Depends(get_db)):
    """
    Centres rattachés à la direction + KPI par centre.
    """
    # CTE commune pour les stats (MOI/MOD/FTE)
    cte_stats = """
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
    """

    # 🩹 PATCH: Gestion du cas spécial SIÈGE (ID Virtuel 9999)
    if direction_id == 9999:
        sql = cte_stats + """
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
            LEFT JOIN stats s ON s.centre_id = c.id
            WHERE c.region_id = 21  -- Force Région Siège
            ORDER BY c.label;
        """
        rows = db.execute(text(sql)).mappings().all()
        return [dict(r) for r in rows]

    # Cas Standard (Via table Directions)
    sql = cte_stats + """
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

@router.post("/simulation/direction/v2", response_model=DirectionSimResponse)
def simulate_direction_v2_clean(payload: DirectionSimRequest, db: Session = Depends(get_db)):
    """Nouvelle route V2 propre pour la simulation direction"""
    print(f"🚀 API V2: Simulation demandée ID={payload.direction_id}")
    try:
        return process_direction_simulation_v2_clean(db, payload)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"[V2] Internal error: {repr(e)}")