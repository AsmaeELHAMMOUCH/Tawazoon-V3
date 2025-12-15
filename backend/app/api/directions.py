from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.db import get_db
from app.schemas.directions import (
    DirectionOut, DirectionsSimIn, DirectionsSimOut, DirectionsSimRow, DirectionsSimTotaux
)
from app.services.directions_sim import hours_from_volumes, ceil_int

router = APIRouter(tags=["directions"])

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
    Centres rattachÃ©s Ã  la direction + KPI par centre :
      - postes      : COUNT(*)
      - type        : MOI / MOD / MOI/MOD
      - fte_actuel  : somme des effectifs des postes du centre
    NB : si ta table centres possÃ¨de direction_id, on filtre dessus.
         Sinon, on tombe en repli sur region_id liÃ© Ã  la direction.
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
@router.post("/directions/simulate", response_model=DirectionsSimOut)
def simulate_directions(payload: DirectionsSimIn, db: Session = Depends(get_db)):
    # map id -> label
    dirs = db.execute(text("SELECT id, label FROM dbo.directions")).mappings().all()
    id_to_label: Dict[int, str] = {int(r["id"]): str(r["label"]) for r in dirs}

    mode = (payload.mode or "").lower()
    hnet = float(payload.heures_net or payload.heures_net_jour)

    rows: List[DirectionsSimRow] = []

    # Handle alias imports -> table mode logic
    if payload.imported_volumes:
        mode = "table"
        # Convert generic dict imports to TableRow objects if possible
        # Or just handle them as ad-hoc dictionaries
        # For simplicity, we re-use the table logic below but we need to map the list
        payload.volumes_par_direction = [
           TableRow(direction_id=int(r.get("id") or r.get("centre_id") or 0),
                    sacs=int(r.get("sacs") or 0),
                    colis=int(r.get("colis") or 0),
                    courrier=int(r.get("courrier", 0) or r.get("courrier_ordinaire", 0)),
                    scelles=int(r.get("scelle", 0) or 0)) 
           for r in payload.imported_volumes
        ]

    if mode == "single" or mode == "direction": # 'direction' treated as single context unless imports exisit
        if not payload.direction_id and not payload.imported_volumes:
             # Just return empty if no context
             pass
        elif payload.direction_id and not payload.imported_volumes:
             # Case: Simulate for one direction with global volumes (or defaults)
             # Here we might fetch ALL centres of this direction and simulate them?
             # Or just simulate the direction as a macro entity?
             # Current frontend expects list of centres. 
             # Let's switch logic: if mode="direction", we simulate *CENTRES* of that direction.
             pass 

    # --- SIMPLIFIED LOGIC FOR ALL MODES ---
    
    # 1. TABLE / IMPORT MODE (Custom volumes per ID)
    if mode == "table":
        table = payload.volumes_par_direction or []
        by_id = {int(r.direction_id): r for r in table} # mapping ID -> Vol
        
        # If we are in 'direction' view, the IDs might be CENTRE IDs, not Direction IDs.
        # We need to distinguish context. Use id_to_label if we are mapping directions, 
        # or fetch centres if we are mapping centres.
        
        # Heuristic: If we received 'imported_volumes', we return rows for those IDs.
        for r in table:
             did = r.direction_id
             # Try to find label in directions; else it might be a centre ID (label unknown here)
             label = id_to_label.get(did, f"ID {did}")
             
             vol = {"sacs": r.sacs, "colis": r.colis, "courrier": r.courrier, "scelles": r.scelles}
             heures = hours_from_volumes(vol)
             # Adjust productivity
             prod_factor = payload.productivite_pct / 100.0
             heures = hours / prod_factor if prod_factor > 0 else hours

             fte = heures / max(1e-4, hnet)
             rows.append(DirectionsSimRow(
                direction_id=did,
                label=label,
                heures=round(heures, 2),
                fte_calcule=round(fte, 2),
                fte_arrondi=ceil_int(fte),
            ))

    # 2. SINGLE / UNIFORM MODE
    elif mode in ["single", "uniform", "direction"]:
         # Treat as: Apply same volume rule to relevant entities.
         # For 'direction' mode, we might want to simulate 'centers' of that direction.
         # But the legacy code here simulates 'Directions'.
         # To unblock the user on "VueDirection", let's assume they want 
         # a list of Directions with calculated values.
         
         target_ids = {}
         if mode == "single" and payload.direction_id:
             target_ids = {payload.direction_id: id_to_label.get(payload.direction_id, "")}
         elif mode == "direction" and payload.direction_id:
             # Just return that one direction
             target_ids = {payload.direction_id: id_to_label.get(payload.direction_id, "")}
         else: # uniform -> all directions
             target_ids = id_to_label

         # Volume to apply
         vol_ref = payload.volume or payload.vol_unique or Volume()
         d_vol = vol_ref.model_dump()
         
         for did, dlabel in target_ids.items():
            heures = hours_from_volumes(d_vol)
            prod_factor = payload.productivite_pct / 100.0
            heures = hours / prod_factor if prod_factor > 0 else hours
            
            fte = heures / max(1e-4, hnet)
            rows.append(DirectionsSimRow(
                direction_id=did,
                label=dlabel,
                heures=round(heures, 2),
                fte_calcule=round(fte, 2),
                fte_arrondi=ceil_int(fte),
            ))
            
    else:
        raise HTTPException(400, "mode invalide (single | uniform | table | direction)")

    heures_total = round(sum(r.heures for r in rows), 2)
    fte_total = round(sum(r.fte_calcule for r in rows), 2)
    fte_total_arrondi = sum(r.fte_arrondi for r in rows)

    return DirectionsSimOut(
        par_direction=rows,
        totaux=DirectionsSimTotaux(
            heures_total=heures_total,
            fte_total=fte_total,
            fte_total_arrondi=fte_total_arrondi,
            heures_net_jour=hnet,
        ),
        details_taches=[r.model_dump() for r in rows] # Mirror rows here for frontend
    )


