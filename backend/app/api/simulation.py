#app/api/simulation.py
from typing import Dict, Any, Optional

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
from app.services.simulation import calculer_simulation, calculer_simulation_sql
from app.services.utils import round_half_up
from app.models.db_models import VolumeSimulation

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
from app.services.simulation_run import (
    insert_simulation_run,
    bulk_insert_volumes,
    upsert_simulation_result
)

# -------------------------------------------------------------------
# /simulate : Vue Intervenant
# -------------------------------------------------------------------
@router.post("/simulate", response_model=SimulationResponse)
def simulate_effectifs(request: SimulationRequest, db: Session = Depends(get_db)):
    try:
        # 🆕 CHECK FOR NEW DETAILED SIMULATION MODE
        if request.volumes_details and len(request.volumes_details) > 0:
            print("==================== REQUEST RECEIVED /simulate (DETAILED SQL MODE) ====================", flush=True)
            
            # 1. Create Simulation Run
            sim_id = insert_simulation_run(
                db=db,
                centre_id=request.centre_id,
                productivite=request.productivite,
                commentaire=getattr(request, 'commentaire', None),
                user_id=getattr(request, 'user_id', None)
            )
            print(f"✅ Created Simulation Run #{sim_id}", flush=True)
            
            # 2. Insert Volumes into VolumeSimulation
            try:
                # We can use bulk_save_objects for speed or simple add_all
                vol_objects = [
                    VolumeSimulation(
                        simulation_id=sim_id,
                        centre_poste_id=v.centre_poste_id,
                        flux_id=v.flux_id,
                        sens_id=v.sens_id,
                        segment_id=v.segment_id,
                        volume=v.volume
                    )
                    for v in request.volumes_details
                ]
                db.bulk_save_objects(vol_objects)
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to insert volume details: {e}")
            
            # 3. Calculate using SQL
            resultat = calculer_simulation_sql(
                db=db, 
                simulation_id=sim_id, 
                heures_net_jour=request.heures_net or 8.0,
                productivite=request.productivite
            )
            
            # 4. Save Result Stats
            upsert_simulation_result(
                db=db,
                simulation_id=sim_id,
                heures=resultat.total_heures or 0.0,
                etp_calc=resultat.fte_calcule or 0.0,
                etp_arr=resultat.fte_arrondi or 0
            )
            db.commit()
            
            return resultat

        # -----------------------------------------------------------
        # LEGACY / FALLBACK LOGIC
        # -----------------------------------------------------------

        # 1) tâches
        sql = """
    SELECT 
        t.id, 
        t.nom_tache, 
        t.phase, 
        t.unite_mesure, 
        t.moyenne_min, 
        t.famille_uo, -- ✅ Ajouté pour règle complexité
        t.centre_poste_id,

        cp.poste_id,
        p.label as poste_label -- ✅ Ajouté pour règle complexité
    FROM dbo.taches t
    INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
    LEFT JOIN dbo.postes p ON p.id = cp.poste_id
    WHERE 1=1
"""
        params: Dict[str, Any] = {}

        if request.centre_id:
            sql += " AND cp.centre_id = :centre_id"
            params["centre_id"] = request.centre_id

        # ✅ Ne filtrer par poste_id que s'il est fourni (pas null)
        # Cela permet de gérer le cas __ALL__ où poste_id est null
        if request.poste_id is not None:
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
        print("\n" + "="*80, flush=True)
        print("🎯 [BACKEND - STEP 1] API /simulate - Requête reçue (VUE INTERVENANT)", flush=True)
        print("="*80, flush=True)
        print(f"   Centre ID: {request.centre_id}", flush=True)
        print(f"   Poste ID: {request.poste_id}", flush=True)
        print(f"   Productivité: {request.productivite}%", flush=True)
        print(f"   Heures nettes: {request.heures_net}h", flush=True)
        print(f"   Volumes journaliers: {volumes_journaliers}", flush=True)
        print(f"   Volumes annuels: {va_dict}", flush=True)
        print(f"   Nombre de tâches: {len(taches_finales)}", flush=True)
        print("="*80 + "\n", flush=True)

        print(f"🔄 [BACKEND - STEP 2] Appel du moteur de calcul...", flush=True)
        # 4) calcul
        resultat = calculer_simulation(
            taches=taches_finales,
            volumes=volumes_journaliers,
            productivite=request.productivite,
            heures_net_input=request.heures_net,
            volumes_annuels=va_dict,
            volumes_mensuels=None,
        )
        
        print(f"\n✅ [BACKEND - STEP 3] Calcul terminé:", flush=True)
        print(f"   ETP: {resultat.fte_arrondi}", flush=True)
        print(f"   Heures totales: {resultat.total_heures}h", flush=True)
        print(f"   Nombre de tâches détaillées: {len(resultat.details_taches or [])}", flush=True)
        print("="*80 + "\n", flush=True)
        
        # 🆕 5) SAUVEGARDE AUTOMATIQUE DE LA SIMULATION
        try:
            from app.services.simulation_run import (
                insert_simulation_run,
                bulk_insert_volumes,
                upsert_simulation_result
            )
            
            # Préparer les volumes pour la sauvegarde
            volumes_to_save = {}
            unites_to_save = {}
            
            # Volumes journaliers
            if request.volumes:
                vol_dict = request.volumes.dict() if hasattr(request.volumes, 'dict') else dict(request.volumes)
                for key, val in vol_dict.items():
                    if val is not None and val != 0:
                        volumes_to_save[key.upper()] = float(val)
                        unites_to_save[key.upper()] = "jour"
            
            # Volumes annuels
            if va_dict:
                for key, val in va_dict.items():
                    if val is not None and val != 0:
                        volumes_to_save[key.upper()] = float(val)
                        unites_to_save[key.upper()] = "an"
            
            # 1. Créer l'enregistrement de simulation
            sim_id = insert_simulation_run(
                db=db,
                centre_id=request.centre_id,
                productivite=request.productivite,
                commentaire=getattr(request, 'commentaire', None),
                user_id=getattr(request, 'user_id', None)
            )
            
            # 2. Sauvegarder les volumes
            if volumes_to_save:
                bulk_insert_volumes(db, sim_id, volumes_to_save, unites_to_save)
            
            # 3. Sauvegarder les résultats
            upsert_simulation_result(
                db=db,
                simulation_id=sim_id,
                heures=resultat.total_heures or 0.0,
                etp_calc=resultat.fte_calcule or 0.0,
                etp_arr=resultat.fte_arrondi or 0
            )
            
            db.commit()
            print(f"✅ Simulation #{sim_id} sauvegardée avec succès", flush=True)
            
        except Exception as e:
            print(f"⚠️  Erreur sauvegarde simulation: {e}", flush=True)
            import traceback
            print(traceback.format_exc(), flush=True)
            # Ne pas bloquer la simulation si la sauvegarde échoue
            db.rollback()
        
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
            SELECT c.label
            FROM dbo.centres c
            WHERE c.id = :centre_id
        """
        print("🔍 [DEBUG] REQUETE SQL MISE A JOUR (FAMILLE + POSTE) CHARGÉE", flush=True)
        centre_label = (
            db.execute(text(sql_centre), {"centre_id": request.centre_id}).scalar()
            or f"Centre {request.centre_id}"
        )

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
        t.famille_uo, -- ✅ INDISPENSABLE pour la règle (condition famille_uo='Distribution locale')
        t.centre_poste_id,

        cp.poste_id,
        p.label as poste_label -- ✅ Ajout du label du poste pour la règle complexité
    FROM dbo.taches t
    INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
    LEFT JOIN dbo.postes p ON p.id = cp.poste_id
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

        # DEBUG : vérifier les ratios reçus (Vue Centre)
        print("==================== REQUEST RECEIVED /vue-centre-optimisee ====================", flush=True)
        print(f"DEBUG vue-centre centre_id = {request.centre_id}", flush=True)
        print(f"DEBUG vue-centre productivite = {request.productivite}", flush=True)
        print(f"DEBUG vue-centre heures_net = {request.heures_net}", flush=True)
        print(f"DEBUG vue-centre idle_minutes = {getattr(request, 'idle_minutes', 0.0)}", flush=True)
        print(f"DEBUG vue-centre volumes_journaliers = {volumes_journaliers}", flush=True)
        print(f"DEBUG vue-centre volumes_annuels (va_dict) = {va_dict}", flush=True)
        print(f"DEBUG vue-centre nb taches finales = {len(taches_finales)}", flush=True)

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
        total_etp_calcule = round(sim_result.fte_calcule or 0.0, 2)
        total_etp_arrondi = sim_result.fte_arrondi or 0
        total_ecart = total_etp_arrondi - total_effectif_actuel

        # 🆕 6) SAUVEGARDE AUTOMATIQUE DE LA SIMULATION
        try:
            from app.services.simulation_run import (
                insert_simulation_run,
                bulk_insert_volumes,
                upsert_simulation_result
            )
            
            # Préparer les volumes pour la sauvegarde
            volumes_to_save = {}
            unites_to_save = {}
            
            # Volumes journaliers
            if request.volumes:
                vol_dict = request.volumes.dict() if hasattr(request.volumes, 'dict') else dict(request.volumes)
                for key, val in vol_dict.items():
                    if val is not None and val != 0:
                        volumes_to_save[key.upper()] = float(val)
                        unites_to_save[key.upper()] = "jour"
            
            # Volumes annuels
            if va_dict:
                for key, val in va_dict.items():
                    if val is not None and val != 0:
                        volumes_to_save[key.upper()] = float(val)
                        unites_to_save[key.upper()] = "an"
            
            # 1. Créer l'enregistrement de simulation
            sim_id = insert_simulation_run(
                db=db,
                centre_id=request.centre_id,
                productivite=request.productivite,
                commentaire=getattr(request, 'commentaire', None),
                user_id=getattr(request, 'user_id', None)
            )
            
            # 2. Sauvegarder les volumes
            if volumes_to_save:
                bulk_insert_volumes(db, sim_id, volumes_to_save, unites_to_save)
            
            # 3. Sauvegarder les résultats
            upsert_simulation_result(
                db=db,
                simulation_id=sim_id,
                heures=total_heures,
                etp_calc=total_etp_calcule,
                etp_arr=total_etp_arrondi
            )
            
            db.commit()
            print(f"✅ Simulation Vue Centre #{sim_id} sauvegardée avec succès", flush=True)
            
        except Exception as e:
            print(f"⚠️  Erreur sauvegarde simulation Vue Centre: {e}", flush=True)
            import traceback
            print(traceback.format_exc(), flush=True)
            # Ne pas bloquer la simulation si la sauvegarde échoue
            db.rollback()

        return {
            "centre_id": request.centre_id,
            "centre_label": centre_label,
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
# Historique des Simulations
# -------------------------------------------------------------------
@router.get("/history")
def history_endpoint(
    centre_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Récupère l'historique des simulations.
    """
    from app.services.simulation_run import get_simulation_history
    
    simulations = get_simulation_history(
        db, 
        centre_id=centre_id, 
        user_id=user_id, 
        limit=limit, 
        offset=offset
    )
    return {"simulations": simulations}

@router.get("/replay/{simulation_id}")
def replay_endpoint(simulation_id: int, db: Session = Depends(get_db)):
    """
    Récupère les données complètes pour rejouer une simulation.
    """
    from app.services.simulation_run import get_simulation_for_replay
    
    data = get_simulation_for_replay(db, simulation_id)
    if not data:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    return data

from app.services.national_v2_service import process_national_simulation
from app.schemas.direction_sim import NationalSimRequest, NationalSimResponse

@router.post("/national", response_model=NationalSimResponse)
def national_simulation(
    request: NationalSimRequest, db: Session = Depends(get_db)
):
    try:
        print("🔹 [NATIONAL] Starting National Simulation...", flush=True)
        return process_national_simulation(db, request)
    except Exception as e:
        import traceback
        print(f"❌ ERREUR national_simulation: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=str(e))