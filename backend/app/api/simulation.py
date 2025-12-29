#app/api/simulation.py
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.db import get_db
from app.schemas.models import (
    SimulationRequest,
    SimulationResponse,
    VolumesInput,
    VolumesAnnuels,
)
from app.services.simulation import calculer_simulation
from app.services.utils import round_half_up

router = APIRouter(tags=["simulation"])

from pydantic import BaseModel

# Inlining GlobalParams logic to avoid import issues
class GlobalParamsIn(BaseModel):
    productivite: float = 100.0
    temps_mort_min: float = 0.0

class GlobalParamsOut(BaseModel):
    productivite: float
    heures_jour: float
    temps_mort_min: float
    heures_nettes_jour: float

def compute_global_params_inline(p: GlobalParamsIn) -> GlobalParamsOut:
    # 8.0 base hours
    h_jour = (p.productivite / 100.0) * 8.0
    # temps mort min -> hours
    t_mort_h = p.temps_mort_min / 60.0
    h_nettes = max(0.0, h_jour - t_mort_h)
    
    return GlobalParamsOut(
        productivite=round(p.productivite, 2),
        heures_jour=round(h_jour, 2),
        temps_mort_min=round(p.temps_mort_min, 2),
        heures_nettes_jour=round(h_nettes, 2)
    )

@router.post("/global-params", response_model=GlobalParamsOut)
def calculate_global_params(p: GlobalParamsIn):
    return compute_global_params_inline(p)

from app.services.simulation_shared import (
    as_snake_annual,
    annual_to_daily_post,
    regroup_tasks_for_scenarios,
    creer_tache_regroupee
)

# -------------------------------------------------------------------
# /simulate : Vue Intervenant
# -------------------------------------------------------------------
@router.post("/simulate", response_model=SimulationResponse)
def simulate_effectifs(request: SimulationRequest, db: Session = Depends(get_db)):
    try:
        # 1) tâches
        sql = """
    SELECT 
        t.id, 
        t.nom_tache, 
        t.phase, 
        t.unite_mesure, 
        t.moyenne_min, 
        t.centre_poste_id,

        cp.poste_id
    FROM dbo.taches t
    INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
    WHERE 1=1
"""
        params: Dict[str, Any] = {}

        if request.centre_id:
            sql += " AND cp.centre_id = :centre_id"
            params["centre_id"] = request.centre_id

        if request.poste_id:
            sql += " AND cp.poste_id = :poste_id"
            params["poste_id"] = request.poste_id

        sql += " ORDER BY t.nom_tache"

        rows = db.execute(text(sql), params).mappings().all()
        taches = [dict(r) for r in rows] if rows else []

        # 2) regroupement courrier (LOGIC SHARED)
        # taches_finales = regroup_tasks_for_scenarios(taches)
        taches_finales = taches

        # 3) volumes
        va_dict = as_snake_annual(getattr(request, "volumes_annuels", None))
        volumes_journaliers = request.volumes.dict() if request.volumes else {}
        volumes_journaliers = annual_to_daily_post(volumes_journaliers)

        # conserver les ratios transmis (pas de conversion /jour)
        raw_req = request.dict(exclude_none=False)
        raw_vols = raw_req.get("volumes", {}) if isinstance(raw_req, dict) else {}

        def _ratio(key, fallback):
            val = raw_vols.get(key, None)
            try:
                return float(val) if val not in (None, "") else (float(fallback) if fallback is not None else None)
            except (TypeError, ValueError):
                return float(fallback) if fallback is not None else None

        # Overwrite ratios explicitly if passed in raw request (because annual_to_daily_post sets defaults)
        if _ratio("colis_amana_par_sac", None) is not None:
             volumes_journaliers["colis_amana_par_sac"] = _ratio("colis_amana_par_sac", 5.0)
        if _ratio("courriers_par_sac", None) is not None:
             volumes_journaliers["courriers_par_sac"] = _ratio("courriers_par_sac", 4500.0)
        volumes_journaliers["colis_par_collecte"] = _ratio("colis_par_collecte", 1.0)


        # DEBUG : vérifier les ratios reçus (Vue Intervenant)
        print("==================== REQUEST RECEIVED /simulate ====================", flush=True)
        print(f"DEBUG simulate volumes_journaliers = {volumes_journaliers}", flush=True)
        print(f"DEBUG simulate volumes_annuels (va_dict) = {va_dict}", flush=True)
        print(f"DEBUG simulate nb taches finales = {len(taches_finales)}", flush=True)

        # 4) calcul
        resultat = calculer_simulation(
            taches=taches_finales,
            volumes=volumes_journaliers,
            productivite=request.productivite,
            heures_net_input=request.heures_net,
            volumes_annuels=va_dict,
            volumes_mensuels=None,
        )
        return resultat

    except Exception as e:
        import traceback

        print(f"❌ ERREUR simulate: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"simulate failed: {e}")


# -------------------------------------------------------------------
# /vue-centre-optimisee : vue par centre avec ETP/poste
# -------------------------------------------------------------------
@router.post("/vue-centre-optimisee")
def simulate_vue_centre_optimisee(
    request: SimulationRequest, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        if not request.centre_id:
            raise HTTPException(status_code=400, detail="centre_id obligatoire")

        # 0) infos centre
        sql_centre = """
            SELECT c.label, c.region_id
            FROM dbo.centres c
            WHERE c.id = :centre_id
        """
        row_centre = db.execute(text(sql_centre), {"centre_id": request.centre_id}).mappings().first()
        centre_label = row_centre["label"] if row_centre else f"Centre {request.centre_id}"
        centre_region_id = row_centre["region_id"] if row_centre else None

        # 0bis) meta postes
        sql_postes = """
            SELECT
                cp.id         AS centre_poste_id,
                cp.poste_id   AS poste_id,
                p.label       AS poste_label,
                p.type_poste  AS type_poste,
                COALESCE(cp.effectif_actuel, 0) AS effectif_actuel,
                p.intitule_rh AS intitule_rh
            FROM dbo.centre_postes cp
            LEFT JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id = :centre_id
        """
        postes_rows = db.execute(
            text(sql_postes), {"centre_id": request.centre_id}
        ).mappings().all()

        postes_meta: Dict[Any, Dict[str, Any]] = {}
        total_effectif_actuel = 0.0

        for r in postes_rows:
            cp_id = r["centre_poste_id"]
            postes_meta[cp_id] = {
                "centre_poste_id": cp_id,
                "poste_id": r["poste_id"],
                "poste_label": r.get("poste_label") or f"Poste {r['poste_id']}",
                "type_poste": r.get("type_poste") or "N/A",
                "effectif_actuel": r["effectif_actuel"],
                "intitule_rh": r.get("intitule_rh"),
            }
            total_effectif_actuel += r["effectif_actuel"] or 0

        # 1) tâches centre
        sql_taches = """
    SELECT 
        t.id, 
        t.nom_tache, 
        t.phase, 
        t.unite_mesure, 
        t.moyenne_min, 
        t.centre_poste_id,

        cp.poste_id
    FROM dbo.taches t
    INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
    WHERE cp.centre_id = :centre_id
    ORDER BY t.nom_tache
"""
        rows = db.execute(
            text(sql_taches), {"centre_id": request.centre_id}
        ).mappings().all()
        taches = [dict(r) for r in rows] if rows else []

        # 2) regroupement courrier (SHARED)
        # tache_finales = regroup_tasks_for_scenarios(taches)
        taches_finales = taches

        # 3) volumes
        va_dict = as_snake_annual(getattr(request, "volumes_annuels", None))
        volumes_journaliers = request.volumes.dict() if request.volumes else {}
        volumes_journaliers = annual_to_daily_post(volumes_journaliers)

        # 🔹 préserver les ratios transmis (pas de conversion /jour)
        raw_req = request.dict(exclude_none=False)
        raw_vols = raw_req.get("volumes", {}) if isinstance(raw_req, dict) else {}

        def _ratio(key, fallback):
            val = None
            if request.volumes:
                val = getattr(request.volumes, key, None)
            if val in (None, ""):
                val = raw_vols.get(key, None)
            return float(val) if val not in (None, "") else float(fallback)

        # Ratios specific overrides if needed (usually handled by annual_to_daily_post but safety here)
        volumes_journaliers["colis_par_collecte"] = _ratio("colis_par_collecte", 1.0)


        # 4) calcul
        sim_result: SimulationResponse = calculer_simulation(
            taches=taches_finales,
            volumes=volumes_journaliers,
            productivite=request.productivite,
            heures_net_input=request.heures_net,
            idle_minutes=getattr(request, "idle_minutes", 0.0),
            volumes_annuels=va_dict,
            volumes_mensuels=None,
        )

        heures_par_poste = sim_result.heures_par_poste or {}
        heures_net = sim_result.heures_net_jour or 8.0

        # 5) payload postes
        print(f"DEBUG: Found {len(postes_meta)} postes for centre {request.centre_id}")
        print(f"DEBUG: Found {len(taches_finales)} taches")

        postes_payload = []
        total_heures_round = 0.0

        for centre_poste_id, meta in postes_meta.items():
            heures_poste = round(
                float(
                    heures_par_poste.get(centre_poste_id)
                    or heures_par_poste.get(str(centre_poste_id))
                    or 0.0
                ),
                2,
            )
            total_heures_round += heures_poste

            etp_calcule = heures_poste / heures_net if heures_net > 0 else 0.0
            etp_arrondi = round_half_up(etp_calcule)
            ecart = etp_arrondi - meta["effectif_actuel"]

            postes_payload.append(
                {
                    "poste_id": meta["poste_id"],
                    "centre_poste_id": centre_poste_id,
                    "poste_label": meta["poste_label"],
                    "type_poste": meta["type_poste"],
                    "effectif_actuel": meta["effectif_actuel"],
                    "total_heures": heures_poste,
                    "etp_calcule": round(etp_calcule, 6),
                    "etp_arrondi": etp_arrondi,
                    "ecart": ecart,
                    "intitule_rh": meta.get("intitule_rh") or "",
                }
            )
        
        
        print(f"DEBUG: Returning {len(postes_payload)} items in 'postes'")

        total_heures = round(sim_result.total_heures or total_heures_round, 2)
        
        # Calculer l'ETP total en sommant tous les postes (MOD + MOI)
        total_etp_calcule_from_postes = sum(p["etp_calcule"] for p in postes_payload)
        total_etp_calcule = round(total_etp_calcule_from_postes, 2)
        
        total_etp_arrondi = sim_result.fte_arrondi or 0
        total_ecart = total_etp_arrondi - total_effectif_actuel

        return {
            "centre_id": request.centre_id,
            "centre_label": centre_label,
            "code": centre_code,
            "region_id": centre_region_id,
            "heures_net": round(heures_net, 2),
            "total_heures": total_heures,
            "total_effectif_actuel": total_effectif_actuel,
            "total_etp_calcule": total_etp_calcule,
            "total_etp_arrondi": total_etp_arrondi,
            "total_ecart": total_ecart,
            "postes": postes_payload,
            "details_taches": [d.dict() for d in (sim_result.details_taches or [])],
        }

    except Exception as e:
        import traceback

        print(f"❌ ERREUR vue-centre-optimisee: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"vue_centre_optimisee failed: {e}"
        )


# -------------------------------------------------------------------
# GET helper /vue-centre-optimisee
# -------------------------------------------------------------------
@router.get("/vue-centre-optimisee")
def get_vue_centre_optimisee(
    centre_id: int,
    sacs: float = 0.0,
    colis: float = 0.0,
    scelle: float = 0.0,
    courrier_ordinaire: float = 0.0,
    courrier_recommande: float = 0.0,
    ebarkia: float = 0.0,
    lrh: float = 0.0,
    amana: float = 0.0,
    productivite: float = 100.0,
    heures_net: float = 8.0,
    colis_amana_par_sac: float = 5.0,
    courriers_par_sac: float = 4500.0,
    idle_minutes: float = 0.0,
    db: Session = Depends(get_db),
):
    # Volumes annuels courrier
    volumes_annuels = VolumesAnnuels(
        courrier_ordinaire=float(courrier_ordinaire or 0),
        courrier_recommande=float(courrier_recommande or 0),
        ebarkia=float(ebarkia or 0),
        lrh=float(lrh or 0),
        amana=float(amana or 0),
    )
    volumes_input = VolumesInput(
        sacs=float(sacs or 0),
        colis=float(colis or 0),
        scelle=float(scelle or 0),
        colis_amana_par_sac=float(colis_amana_par_sac or 5.0),
        courriers_par_sac=float(courriers_par_sac or 4500.0),
    )
    req = SimulationRequest(
        centre_id=centre_id,
        productivite=productivite,
        heures_net=heures_net,
        volumes=volumes_input,
        volumes_annuels=volumes_annuels,
        idle_minutes=idle_minutes,
    )
    return simulate_vue_centre_optimisee(req, db)


# -------------------------------------------------------------------
# /vue-centre-sans-regroupement
# -------------------------------------------------------------------
@router.post("/vue-centre-sans-regroupement", response_model=SimulationResponse)
def simulate_sans_regroupement(
    request: SimulationRequest, db: Session = Depends(get_db)
):
    try:
        sql = """
    SELECT 
        t.id, 
        t.nom_tache, 
        t.phase, 
        t.unite_mesure, 
        t.moyenne_min, 
        t.centre_poste_id,

        cp.poste_id
    FROM dbo.taches t
    INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
    WHERE cp.centre_id = :centre_id
    ORDER BY t.nom_tache
"""

        rows = db.execute(
            text(sql), {"centre_id": request.centre_id}
        ).mappings().all()
        taches = [dict(r) for r in rows] if rows else []

        va_dict = _as_snake_annual(getattr(request, "volumes_annuels", None))
        volumes_journaliers = request.volumes.dict() if request.volumes else {}
        volumes_journaliers = _annual_to_daily_post(volumes_journaliers)

        resultat = calculer_simulation(
            taches=taches,
            volumes=volumes_journaliers,
            productivite=request.productivite,
            heures_net_input=request.heures_net,
            volumes_mensuels=None,
            volumes_annuels=va_dict,
        )
        return resultat

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"sans_regroupement failed: {e}")


# -------------------------------------------------------------------
# /vue-intervenant-details
# -------------------------------------------------------------------
@router.get("/vue-intervenant-details")
def get_vue_intervenant_details(
    centre_id: str, db: Session = Depends(get_db)
):
    try:
        sql = """
            SELECT
                cp.id as poste_id,
                COALESCE(p.label, cp.label) as poste_label,
                COALESCE(p.type_poste, cp.type_poste) as type_poste,
                COALESCE(cp.effectif_actuel, 0) as effectif_actuel,
                t.nom_tache,
                t.moyenne_min,
                t.unite_mesure
            FROM dbo.centre_postes cp
            LEFT JOIN dbo.postes p ON p.id = cp.poste_id
            LEFT JOIN dbo.taches t ON t.centre_poste_id = cp.id
            WHERE cp.centre_id = :centre_id
            ORDER BY COALESCE(p.label, cp.label), t.nom_tache
        """
        rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()

        resultat: Dict[str, Any] = {
            "centre_label": f"Centre {centre_id}",
            "total_effectif_actuel": 0.0,
            "postes": [],
            "heures_net": 8.0,
        }

        postes_dict: Dict[Any, Dict[str, Any]] = {}

        for row in rows:
            poste_id = row["poste_id"]
            if poste_id not in postes_dict:
                postes_dict[poste_id] = {
                    "poste_id": poste_id,
                    "poste_label": row["poste_label"],
                    "type_poste": row["type_poste"],
                    "effectif_actuel": row["effectif_actuel"],
                    "total_heures": 0.0,
                    "taches": [],
                }
                resultat["total_effectif_actuel"] += row["effectif_actuel"] or 0

            if row["nom_tache"]:
                postes_dict[poste_id]["taches"].append(
                    {
                        "nom_tache": row["nom_tache"],
                        "moyenne_min": row["moyenne_min"],
                        "unite_mesure": row["unite_mesure"],
                    }
                )

        resultat["postes"] = list(postes_dict.values())
        return resultat

    except Exception as e:
        print(f"❌ Erreur vue-intervenant-details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------
# /simulation/centre/run : Persisted Run
# -------------------------------------------------------------------
from app.services.simulation_run import (
    SimulationRunInput, 
    SimulationRunOutput,
    insert_simulation_run,
    bulk_insert_volumes,
    upsert_simulation_result
)

@router.post("/centre/run")
def run_and_persist_simulation(payload: SimulationRunInput, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Runs a simulation for a centre, PERSISTS inputs and results, and returns the FULL detailed response.
    Transactional.
    """
    # 1. Start Transaction
    print(f"🚀 [API] POST /api/centre/run called. Payload: {payload}")
    
    try:
        # A. Insert Run Header
        sim_id = insert_simulation_run(
            db, 
            centre_id=payload.centre_id, 
            productivite=payload.productivite, 
            commentaire=payload.commentaire, 
            user_id=payload.user_id
        )
        print(f"✅ [API] Run Inserted. ID: {sim_id}")
        
        # B. Bulk Insert Volumes
        bulk_insert_volumes(db, sim_id, payload.volumes, payload.unites)
        print(f"✅ [API] Volumes Inserted: {len(payload.volumes)}")
        
        # C. Call Simulation Logic (Vue Centre Optimisee) to get full details
        # We must map 'payload' (SimulationRunInput) to 'request' (SimulationRequest)
        
        # Mapping volumes (Input is flat dict with code keys, Request expects annuals + daily)
        # We need to reverse-map the input keys effectively.
        
        key_map = {
            "CO": "courrier_ordinaire",
            "CR": "courrier_recommande",
            "EBARKIA": "ebarkia",
            "LRH": "lrh",
            "COLIS": "colis",
            "AMANA": "amana",
            "SACS": "sacs"
        }
        
        normalized_volumes = {}
        for k, v in payload.volumes.items():
            mapped_key = key_map.get(k.upper(), k.lower())
            normalized_volumes[mapped_key] = v

        # Construct VolumesAnnuels and VolumesInput
        # Assumption: If unit is 'an', it goes to annuels. If 'jour', to daily.
        # Fallback: Put everything in annuals if ambiguous, except known dailies.
        
        vol_annuels_args = {}
        vol_daily_args = {}
        
        for k, v in payload.volumes.items():
            unit = payload.unites.get(k, "an").lower()
            mapped = key_map.get(k.upper(), k.lower())
            val = float(v)
            
            if "jour" in unit or k.upper() in ["SACS", "COLIS"]: 
                # SACS/COLIS are usually daily inputs in VueCentre
                if k.upper() == "COLIS": vol_daily_args["colis"] = val
                elif k.upper() == "SACS": vol_daily_args["sacs"] = val
                else: vol_daily_args[mapped] = val
            else:
                vol_annuels_args[mapped] = val
                
        # Handle volumes_annuels object
        volumes_annuels_obj = VolumesAnnuels(**{k: v for k, v in vol_annuels_args.items() if k in VolumesAnnuels.__fields__})
        
        # Handle daily volumes object
        # Note: SimulationRequest.volumes is VolumesInput
        volumes_input_obj = VolumesInput(**{k: v for k, v in vol_daily_args.items() if k in VolumesInput.__fields__})
        
        # Missing fields default to 0
        
        req = SimulationRequest(
            centre_id=payload.centre_id,
            productivite=payload.productivite,
            heures_net=8.0, # Default or passed? payload doesn't have it. Assume 8.
            volumes=volumes_input_obj,
            volumes_annuels=volumes_annuels_obj,
            idle_minutes=0.0
        )
        
        # Call the existing logic
        result_full = simulate_vue_centre_optimisee(req, db)
        
        # D. Upsert Result (using calculated KPIs)
        etp_rounded = result_full.get("total_etp_arrondi", 0)
        etp_calc = result_full.get("total_etp_calcule", 0.0)
        heures = result_full.get("total_heures", 0.0)
        
        upsert_simulation_result(db, sim_id, heures, etp_calc, etp_rounded)
        
        # E. Commit
        db.commit()
        
        # F. Return full result with ID
        result_full["simulation_id"] = sim_id
        result_full["created_at"] = datetime.now().isoformat()
        
        return result_full

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transaction Failed: {e}")

from app.services.simulation_run import get_simulation_run

@router.get("/simulation/run/{simulation_id}")
def read_simulation_run(simulation_id: int, db: Session = Depends(get_db)):
    """
    Get full details of a persisted simulation run.
    """
    data = get_simulation_run(db, simulation_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation Run not found")
    return data

@router.get("/simulation/history")
def get_history(
    centre_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Récupère l'historique des simulations avec pagination et filtres.
    """
    from app.services.simulation_run import get_simulation_history
    
    history = get_simulation_history(
        db=db,
        centre_id=centre_id,
        user_id=user_id,
        limit=limit,
        offset=offset
    )
    
    return {
        "simulations": history,
        "count": len(history),
        "limit": limit,
        "offset": offset
    }

@router.get("/simulation/{simulation_id}/replay")
def get_replay_data(simulation_id: int, db: Session = Depends(get_db)):
    """
    Récupère les données d'une simulation pour la rejouer.
    """
    from app.services.simulation_run import get_simulation_for_replay
    
    data = get_simulation_for_replay(db, simulation_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return data

