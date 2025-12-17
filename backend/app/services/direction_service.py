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
    # 1) Validate Direction
    direction = db.execute(
        text("SELECT id, label FROM dbo.directions WHERE id = :id"),
        {"id": request.direction_id},
    ).mappings().first()

    if not direction:
        raise HTTPException(status_code=404, detail=f"Direction {request.direction_id} not found")

    # 2) Fetch Centres for this Direction
    sql_centres = """
        SELECT c.id, c.label, c.region_id, c.categorie_id
        FROM dbo.centres c
        INNER JOIN dbo.directions d ON d.id = :dir_id
        WHERE c.direction_id = :dir_id
           OR ( (c.direction_id IS NULL OR c.direction_id = 0) AND c.region_id = d.region_id )
    """
    centres_rows = db.execute(text(sql_centres), {"dir_id": request.direction_id}).mappings().all()
    centres_map = {int(c["id"]): dict(c) for c in centres_rows}

    all_centre_ids = list(centres_map.keys())
    if not all_centre_ids:
        return DirectionSimResponse(
            direction_id=request.direction_id,
            direction_label=direction["label"],
            mode=request.mode,
            kpis=DirectionKPIs(nb_centres=0, etp_actuel=0, etp_calcule=0, ecart_global=0),
            rows=[],
            chart_distribution_moi_mod=[],
            chart_top_gaps=[],
            report=ImportReport(
                total_lignes=len(request.volumes),
                matched_centres=0,
                unknown_centres=[],
                ignored_centres=0,
            ),
        )

    # 3) Match Imports to Centres (centre_id OR centre_label)
    matched_volumes: Dict[int, CentreVolume] = {}
    unknown_labels = []
    ignored_count = 0

    label_to_id = {normalize_string(c["label"]): cid for cid, c in centres_map.items()}

    for vol in request.volumes:
        raw_cid = getattr(vol, "centre_id", None)
        raw_label = getattr(vol, "centre_label", None)

        cid_norm = None
        if raw_cid is not None:
            try:
                cid_norm = int(raw_cid)
            except Exception:
                cid_norm = None

        label_norm = normalize_string(raw_label)

        found_id = None

        # a) match by centre_id if provided and valid in this direction
        if cid_norm is not None and cid_norm in centres_map:
            found_id = cid_norm

        # b) match by normalized label
        if not found_id and label_norm:
            found_id = label_to_id.get(label_norm)

        if found_id:
            matched_volumes[found_id] = vol
        else:
            if label_norm:
                unknown_labels.append(raw_label or "")
            else:
                ignored_count += 1

    # ✅ centres à simuler :
    # - si l'import contient des lignes => simuler UNIQUEMENT les centres matchés
    # - sinon => simuler tous les centres de la direction
    if request.volumes and len(request.volumes) > 0:
        centre_ids_to_simulate = list(matched_volumes.keys())
    else:
        centre_ids_to_simulate = all_centre_ids

    # Si import présent mais aucun match => erreur claire
    if request.volumes and len(request.volumes) > 0 and not centre_ids_to_simulate:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Aucun centre reconnu dans l'import.",
                "unknown_centres": list(set(unknown_labels)),
                "hint": "Assure-toi que le libellé 'centre_label' (Nom du Centre) correspond exactement à dbo.centres.label, ou ajoute 'centre_id' dans l'import.",
            },
        )

    # 4) Fetch tasks + postes info (bulk) pour TOUS les centres de la direction
    # (on récupère tout, mais on calculera uniquement sur centre_ids_to_simulate)
    is_recommande = (request.mode == "recommande")
    table_tache = "dbo.Tache_rec" if is_recommande else "dbo.taches"

    placeholders = [f":id{i}" for i in range(len(all_centre_ids))]
    ids_map = {f"id{i}": cid for i, cid in enumerate(all_centre_ids)}

    sql_tasks = f"""
        SELECT
            t.nom_tache, t.unite_mesure, t.moyenne_min, t.phase,
            cp.id as centre_poste_id, cp.centre_id, cp.effectif_actuel,
            p.id as poste_id, p.label as poste_label, p.type_poste
        FROM {table_tache} t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        INNER JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id IN ({', '.join(placeholders)})
    """

    try:
        tasks_rows = db.execute(text(sql_tasks), ids_map).mappings().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error during Task Fetch: {str(e)}")

    tasks_by_centre = {cid: [] for cid in all_centre_ids}
    postes_info_by_centre = {cid: {} for cid in all_centre_ids}

    for row in tasks_rows:
        cid = int(row["centre_id"])
        tasks_by_centre[cid].append(dict(row))

        pid = int(row["poste_id"])
        if pid not in postes_info_by_centre[cid]:
            postes_info_by_centre[cid][pid] = {
                "type": (row["type_poste"] or "MOD").upper(),
                "effectif": float(row["effectif_actuel"] or 0),
            }

    # 5) Simulate each centre
    results = []
    global_p = request.global_params



    for cid in centre_ids_to_simulate:
        centre_data = centres_map[cid]
        
        # ✅ FIX 1: Regroupement des tâches (Identique à la page Centre)
        raw_tasks = tasks_by_centre.get(cid, [])
        c_tasks = regroup_tasks_for_scenarios(raw_tasks)

        # ✅ FIX 2: Traitement des volumes (Identique à la page Centre)
        # On construit un dictionnaire "flat" mimant VolumesInput
        vol_input = matched_volumes.get(cid)
        
        raw_volumes = {}
        if vol_input:
            raw_volumes = {
                "sacs": float(getattr(vol_input, "sacs", 0) or 0),
                "colis": float(getattr(vol_input, "colis", 0) or 0),
                "scelle": float(getattr(vol_input, "scelle", 0) or 0), # if available in CentreVolume
                "courrier": float(getattr(vol_input, "courrier", 0) or 0), # Legacy?

                # Ratios (pass explicit None if missing to let helper set defaults)
                "colis_amana_par_sac": float(vol_input.colis_amana_par_sac) if vol_input.colis_amana_par_sac is not None else None,
                "courriers_par_sac": float(vol_input.courriers_par_sac) if vol_input.courriers_par_sac is not None else None,
            }
        else:
            # Default empty volumes
             raw_volumes = {
                "sacs": 0.0, "colis": 0.0, "scelle": 0.0,
                "colis_amana_par_sac": None, "courriers_par_sac": None
             }

        # Appliquer la conversion annuelle -> journalière (divisé par 264) + Defaults Ratios
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
