# services/direction_service.py
from typing import Dict
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

import re
import unicodedata

from app.schemas.direction_sim import (
    DirectionSimRequest,
    DirectionSimResponse,
    DirectionKPIs,
    CentreResultRow,
    ImportReport,
    ChartDataPoint,
    CentreVolume,
)
from app.models.db_models import CentreVolumeRef
from app.services.simulation import calculer_simulation
from app.services.simulation_shared import (
    regroup_tasks_for_scenarios,
    annual_to_daily_post,
    as_snake_annual,
)


def normalize_string(s: str) -> str:
    """
    Normalisation robuste pour matcher des labels Excel vs DB:
    - lower
    - trim
    - remove accents
    - replace punctuation by spaces
    - collapse spaces
    """
    if not s:
        return ""
    s = str(s).strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = " ".join(s.split())
    return s

def process_direction_simulation(db: Session, request: DirectionSimRequest) -> DirectionSimResponse:
    # 1) Get Direction Information
    d_row = db.execute(
        text("SELECT id, label, region_id FROM dbo.directions WHERE id = :did"),
        {"did": request.direction_id}
    ).mappings().first()
    
    if not d_row:
        raise HTTPException(404, "Direction introuvable")
    
    direction = dict(d_row)

    # 2) Identify Scoped Centres
    sql_centres = """
        SELECT c.id, c.label, c.code_centre
        FROM dbo.centres c
        WHERE c.direction_id = :did
           OR ((c.direction_id IS NULL OR c.direction_id = 0) AND c.region_id = :rid)
    """
    c_rows = db.execute(
        text(sql_centres),
        {"did": direction["id"], "rid": direction["region_id"]}
    ).mappings().all()
    
    centres_map = {r.id: dict(r) for r in c_rows}
    all_centre_ids = list(centres_map.keys())

    # 3) Process Inputs
    matched_volumes: Dict[int, CentreVolume] = {}
    label_to_id = {normalize_string(c["label"]): c["id"] for c in centres_map.values()}
    unknown_labels = []
    ignored_count = 0
    
    for v in request.volumes:
        cid = None
        if v.centre_id:
            cid = v.centre_id
        elif v.centre_label:
            norm = normalize_string(v.centre_label)
            cid = label_to_id.get(norm)
            
        if cid and cid in centres_map:
            matched_volumes[cid] = v
        else:
            if v.centre_label:
                unknown_labels.append(v.centre_label)
            else:
                ignored_count += 1

    centre_ids_to_simulate = all_centre_ids
    
    # 4) Fetch Postes & Tasks
    postes_info_by_centre = {cid: {} for cid in centre_ids_to_simulate}
    tasks_by_centre = {cid: [] for cid in centre_ids_to_simulate}
    
    if centre_ids_to_simulate:
        # A. Postes Info
        sql_postes = """
            SELECT cp.centre_id, p.code, p.type_poste, cp.effectif_actuel
            FROM dbo.centre_postes cp
            JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id IN :cids
        """
        p_rows = db.execute(
            text(sql_postes), 
            {"cids": tuple(centre_ids_to_simulate)}
        ).mappings().all()
        
        for r in p_rows:
            postes_info_by_centre[r.centre_id][r.code] = {
                "effectif": float(r.effectif_actuel or 0),
                "type": (r.type_poste or "").upper().strip()
            }
            
        # B. Tasks
        sql_tasks = """
            SELECT t.*, p.code as poste_code, p.nom_poste, p.type_poste, cp.centre_id
            FROM dbo.taches t
            JOIN dbo.postes p ON p.id = t.poste_id
            JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            WHERE cp.centre_id IN :cids
        """
        t_rows = db.execute(
            text(sql_tasks),
            {"cids": tuple(centre_ids_to_simulate)}
        ).mappings().all()
        
        for r in t_rows:
            tasks_by_centre[r.centre_id].append(dict(r))

    # Next steps continue...
    
    # 4b) Fetch Reference Volumes (Database Mode / Fallback)
    # We fetch them for ALL simulated centers to allow fallback if a line is missing in Excel too
    ref_volumes_map = {}
    if centre_ids_to_simulate:
        # Avoid huge IN clause if empty
        try:
             # SQL Alchemy ORM or Core? We used Core for everything else here. 
             # Let's stick to Core to match the style or use the model index.
             # Model: CentreVolumeRef. 
             refs = db.query(CentreVolumeRef).filter(CentreVolumeRef.centre_id.in_(centre_ids_to_simulate)).all()
             for r in refs:
                 ref_volumes_map[r.centre_id] = r
        except Exception as e:
            print(f"Error fetching volume refs: {e}")
            # Non-blocking, just empty

    # 5) Simulate each centre
    results = []
    global_p = request.global_params

    for cid in centre_ids_to_simulate:
        centre_data = centres_map[cid]
        
        # ✅ FIX 1: Regroupement des tâches
        raw_tasks = tasks_by_centre.get(cid, [])
        c_tasks = regroup_tasks_for_scenarios(raw_tasks)

        # ✅ FIX 2: Traitement des volumes
        # On remplace volumes "database" si dispo
        vol_input = matched_volumes.get(cid)
        ref_input = ref_volumes_map.get(cid)
        
        raw_volumes = {}
        
        # Priority: Input (Excel) > Ref (DB) > Zero
        
        if vol_input:
            # Source: Excel / Input
            raw_volumes = {
                "sacs": float(getattr(vol_input, "sacs", 0) or 0),
                "colis": float(getattr(vol_input, "colis", 0) or 0),
                "scelle": float(getattr(vol_input, "scelle", 0) or 0),
                "courrier": float(getattr(vol_input, "courrier", 0) or 0),
                
                "colis_amana_par_sac": float(vol_input.colis_amana_par_sac) if vol_input.colis_amana_par_sac is not None else None,
                "courriers_par_sac": float(vol_input.courriers_par_sac) if vol_input.courriers_par_sac is not None else None,
            }
        elif ref_input:
             # Source: Database Ref
            raw_volumes = {
                "sacs": float(ref_input.sacs or 0),
                "colis": float(ref_input.colis or 0),
                "scelle": 0.0, # Not in ref currently?
                "courrier": 0.0, # Legacy
                
                "colis_amana_par_sac": float(ref_input.colis_amana_par_sac) if ref_input.colis_amana_par_sac is not None else None,
                "courriers_par_sac": float(ref_input.courriers_par_sac) if ref_input.courriers_par_sac is not None else None,
            }
        else:
            # Default empty
             raw_volumes = {
                "sacs": 0.0, "colis": 0.0, "scelle": 0.0,
                "colis_amana_par_sac": None, "courriers_par_sac": None
             }

        # Appliquer la conversion annuelle ...-> journalière (divisé par 264) + Defaults Ratios
        volumes_dict = annual_to_daily_post(raw_volumes)
        
        # Ajouter idle_minutes (param global)
        volumes_dict["idle_minutes"] = float(global_p.idle_minutes or 0)

        # Volumes Annuels (direct pass-through, processed by as_snake_annual inside calc? No, calc expects dict)
        # We need to construct volumes_annuels dict
        if vol_input:
             volumes_annuels = {
                "courrier_ordinaire": float(getattr(vol_input, "courrier_ordinaire", 0) or 0),
                "courrier_recommande": float(getattr(vol_input, "courrier_recommande", 0) or 0),
                "ebarkia": float(getattr(vol_input, "ebarkia", 0) or 0),
                "lrh": float(getattr(vol_input, "lrh", 0) or 0),
                "amana": float(getattr(vol_input, "amana", 0) or 0),
            }
        else:
             volumes_annuels = {
                "courrier_ordinaire": 0.0, "courrier_recommande": 0.0, "ebarkia": 0.0, "lrh": 0.0, "amana": 0.0
            }

        try:
            sim_res = calculer_simulation(
                taches=c_tasks,
                volumes=volumes_dict,
                productivite=float(global_p.productivite or 100),
                heures_net_input=float(global_p.heures_par_jour or 7.5),
                idle_minutes=float(global_p.idle_minutes or 0),
                volumes_annuels=volumes_annuels,
            )
        except Exception as e:
            # 🔥 rendre l'erreur lisible côté frontend
            raise HTTPException(
                status_code=422,
                detail=f"Erreur calcul centre='{centre_data['label']}' (id={cid}) : {str(e)}",
            )

        etp_calcule = float(getattr(sim_res, "fte_calcule", 0) or 0)
        etp_actuel = sum(p["effectif"] for p in postes_info_by_centre[cid].values())

        types = {p["type"] for p in postes_info_by_centre[cid].values()}
        if "MOI" in types and "MOD" in types:
            cat = "MOI/MOD"
        elif "MOI" in types:
            cat = "MOI"
        elif "MOD" in types:
            cat = "MOD"
        else:
            cat = "N/A"

        results.append(CentreResultRow(
            centre_id=cid,
            centre_label=centre_data["label"],
            categorie=cat,
            etp_actuel=round(etp_actuel, 2),
            etp_calcule=round(etp_calcule, 2),
            ecart=round(etp_calcule - etp_actuel, 2),
            heures_calc=float(getattr(sim_res, "total_heures", 0) or 0),
        ))

    # 6) KPIs + charts + report
    total_etp_actuel = sum(r.etp_actuel for r in results)
    total_etp_calcule = sum(r.etp_calcule for r in results)

    # Debug utile (serveur)
    print("DEBUG import labels:", [normalize_string(getattr(v, "centre_label", "")) for v in request.volumes])
    print("DEBUG matched centre ids:", list(matched_volumes.keys()))
    print("DEBUG simulated centre ids:", centre_ids_to_simulate)

    kpis = DirectionKPIs(
        nb_centres=len(results),
        etp_actuel=round(total_etp_actuel, 2),
        etp_calcule=round(total_etp_calcule, 2),
        ecart_global=round(total_etp_calcule - total_etp_actuel, 2),
    )

    dist_map = {}
    for r in results:
        dist_map[r.categorie] = dist_map.get(r.categorie, 0) + r.etp_calcule
    chart_dist = [ChartDataPoint(name=k, value=round(v, 2)) for k, v in dist_map.items()]

    top_5 = sorted(results, key=lambda x: x.ecart, reverse=True)[:5]
    chart_top = [ChartDataPoint(name=r.centre_label, value=r.ecart) for r in top_5]

    report = ImportReport(
        total_lignes=len(request.volumes),
        matched_centres=len(matched_volumes),
        unknown_centres=list(set(unknown_labels)),
        ignored_centres=ignored_count,
    )

    return DirectionSimResponse(
        direction_id=request.direction_id,
        direction_label=direction["label"],
        mode=request.mode,
        kpis=kpis,
        rows=results,
        chart_distribution_moi_mod=chart_dist,
        chart_top_gaps=chart_top,
        report=report,
    )
