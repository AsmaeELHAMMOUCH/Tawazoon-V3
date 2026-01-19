# FORCE RELOAD
import unicodedata
import re

def normalize_string(s: str) -> str:
    if not s:
        return ""
    s = str(s).lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = " ".join(s.split())
    return s

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
import traceback

# Moteur de calcul central
from app.services.simulation import calculer_simulation

# Schemas
from app.schemas.direction_sim import (
    DirectionSimRequest, 
    DirectionSimResponse, 
    DirectionKPIs, 
    CentreResultRow, 
    ImportReport, 
    ChartDataPoint, 
    CentreVolume,
    VolumeMatriciel
)
from app.models.db_models import CentreVolumeRef

def convert_volumes_matriciels_to_classic(volumes_matriciels: List) -> Dict[str, float]:
    """
    Convertit une liste de volumes matriciels (flux_id, sens_id, segment_id, volume)
    en format classique utilisable par le moteur de simulation.
    
    Pour l'instant, on fait une agrégation simple:
    - On somme tous les volumes par flux pour obtenir des totaux
    - On retourne un dict compatible avec le moteur actuel
    
    TODO: Implémenter la logique métier exacte pour chaque combinaison flux/sens/segment
    """
    result = {
        "sacs": 0.0,
        "colis": 0.0,
        "courrier_ordinaire": 0.0,
        "courrier_recommande": 0.0,
        "ebarkia": 0.0,
        "lrh": 0.0,
        "amana": 0.0,
        "colis_amana_par_sac": 5.0,
        "courriers_par_sac": 4500.0,
        "colis_par_collecte": 1.0
    }
    
    # Mapping flux_id -> clé
    flux_mapping = {
        1: "amana",
        2: "courrier_ordinaire",  # CO
        3: "courrier_recommande",  # CR
        4: "ebarkia",
        5: "lrh"
    }
    
    for vol in volumes_matriciels:
        flux_id = vol.flux_id
        sens_id = vol.sens_id
        segment_id = vol.segment_id
        volume = vol.volume
        
        # Guichet (sens_id = 2)
        if sens_id == 2:
            if segment_id == 6:  # DÉPÔT
                result["sacs"] += volume
            elif segment_id == 7:  # RÉCUP
                result["colis"] += volume
        
        # Flux (sens_id = 1 ou 3)
        elif flux_id and flux_id in flux_mapping:
            key = flux_mapping[flux_id]
            result[key] += volume
    
    print(f"📊 Volumes matriciels convertis: {result}")
    return result

def process_direction_simulation_v2_clean(db: Session, request: DirectionSimRequest) -> DirectionSimResponse:
    """
    Refonte complète de la simulation direction.
    Logique : 
    1. Récupère les centres de la direction.
    2. Pour chaque centre, récupère les volumes (Excel > DB > 0).
    3. Applique la simulation via 'calculer_simulation' (moteur unique).
    4. Agrège les résultats.
    """
    print(f"🔹 [V2] DEBUT Simulation Direction ID={request.direction_id}")

    # 1. Récupérer la Direction
    if request.direction_id == 9999:
        # PATCH SIÈGE
        direction = {"id": 9999, "label": "SIÈGE", "region_id": 21}
        print(f"🔹 [V2] Simulation Mode SIÈGE (Virtuel)")
    else:
        d_row = db.execute(
            text("SELECT id, label, region_id FROM dbo.directions WHERE id = :did"),
            {"did": request.direction_id}
        ).mappings().first()
        
        if not d_row:
            raise HTTPException(404, "Direction introuvable")
        direction = dict(d_row)

    # 2. Récupérer les Centres (SQL minimaliste sans colonnes fantômes)
    if direction["id"] == 9999:
         # Query spécifique Siège (par Région uniquement)
         c_rows = db.execute(
            text("SELECT id, label FROM dbo.centres WHERE region_id = :rid"),
            {"rid": direction["region_id"]} # 21
        ).mappings().all()
    else:
        # Query Standard
        c_rows = db.execute(
            text("SELECT id, label FROM dbo.centres WHERE direction_id = :did OR (region_id = :rid AND (direction_id IS NULL OR direction_id = 0))"),
            {"did": direction["id"], "rid": direction["region_id"]}
        ).mappings().all()
    
    centres_map = {r.id: dict(r) for r in c_rows}
    centre_ids = list(centres_map.keys())
    
    print(f"🔹 [V2] {len(centre_ids)} centres identifiés pour la simulation.")

    # 3. Récupérer les données Techniques (Postes, Tâches) en un bloc optimisé
    tasks_by_centre = {cid: [] for cid in centre_ids}
    postes_info_by_centre = {cid: [] for cid in centre_ids}
    
    if centre_ids:
        # Tâches
        # Expansion manuelle pour éviter erreur TVP PyODBC
        ids_str = ",".join(str(cid) for cid in centre_ids)

        # Tâches (Correction Jointures et Noms colonnes)
        sql_tasks = f"""
            SELECT t.*, 
                   p.label as poste_code, 
                   p.label as nom_poste, 
                   p.type_poste, 
                   cp.centre_id
            FROM dbo.taches t
            JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
            JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id IN ({ids_str})
        """
        # Note: on n'utilise plus de paramètres liés pour la liste
        t_rows = db.execute(text(sql_tasks)).mappings().all()
        for r in t_rows:
            tasks_by_centre[r.centre_id].append(dict(r))
            
        # Postes (Effectifs Actuels - Correction Noms colonnes)
        sql_postes = f"""
            SELECT cp.centre_id, 
                   cp.id as cp_id,
                   p.label as nom_poste, 
                   p.type_poste, 
                   cp.effectif_actuel
            FROM dbo.centre_postes cp
            JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id IN ({ids_str})
        """
        p_rows = db.execute(text(sql_postes)).mappings().all()
        for r in p_rows:
            if r.centre_id not in postes_info_by_centre:
                postes_info_by_centre[r.centre_id] = []
            
            # Safety check: if initialized as dict by mistake somewhere else, reset to list
            if isinstance(postes_info_by_centre[r.centre_id], dict):
                 postes_info_by_centre[r.centre_id] = []

            postes_info_by_centre[r.centre_id].append({
                "cp_id": r.cp_id,
                "label": r.nom_poste,
                "effectif": float(r.effectif_actuel or 0),
                "type": (r.type_poste or "").strip().upper()
            })

    # 4. Préparer le Matching des Volumes Importés (Excel)
    matched_volumes: Dict[int, CentreVolume] = {}
    matched_volumes_matriciels: Dict[int, List] = {}  # Nouveau: volumes matriciels par centre
    label_to_id = {normalize_string(c["label"]): c["id"] for c in centres_map.values()}
    unknown_labels = []
    
    # 4a. Traiter volumes classiques (ancien format)
    for v in request.volumes:
        cid = None
        if v.centre_id and v.centre_id in centres_map:
            cid = v.centre_id
        elif v.centre_label:
            norm = normalize_string(v.centre_label)
            cid = label_to_id.get(norm)
        
        if cid:
            matched_volumes[cid] = v
        elif v.centre_label:
            unknown_labels.append(v.centre_label)
    
    # 4b. Traiter volumes matriciels (nouveau format)
    if request.volumes_matriciels:
        print(f"🔹 [V2] Traitement de {len(request.volumes_matriciels)} volumes matriciels")
        
        for vol_mat in request.volumes_matriciels:
            cid = None
            if vol_mat.centre_id and vol_mat.centre_id in centres_map:
                cid = vol_mat.centre_id
            elif vol_mat.centre_label:
                norm = normalize_string(vol_mat.centre_label)
                cid = label_to_id.get(norm)
            
            if cid:
                if cid not in matched_volumes_matriciels:
                    matched_volumes_matriciels[cid] = []
                matched_volumes_matriciels[cid].append(vol_mat)
            elif vol_mat.centre_label:
                if vol_mat.centre_label not in unknown_labels:
                    unknown_labels.append(vol_mat.centre_label)
        
        print(f"🔹 [V2] Volumes matriciels groupés pour {len(matched_volumes_matriciels)} centres")


    # 5. Récupérer les Volumes de Référence (DB) pour fallback
    ref_volumes_map = {}
    if centre_ids:
        try:
             refs = db.query(CentreVolumeRef).filter(CentreVolumeRef.centre_id.in_(centre_ids)).all()
             for r in refs:
                 ref_volumes_map[r.centre_id] = r
        except Exception as e:
            print(f"⚠️ [V2] Erreur chargement refs volumes: {e}")

    # 6. Boucle de Simulation par Centre
    results = []
    global_p = request.global_params
    
    from app.services.simulation_shared import regroup_tasks_for_scenarios
    from app.schemas.direction_sim import PosteDetail

    for cid in centre_ids:
        centre_data = centres_map[cid]
        
        # A. Volumes
        vol_import = matched_volumes.get(cid)
        vol_matriciels = matched_volumes_matriciels.get(cid)
        vol_ref = ref_volumes_map.get(cid)
        
        # Construction des volumes BRUTS (Journaliers pour Sacs/Colis, Annuels pour le reste)
        raw_v = {}
        
        # Priorité 1: Volumes matriciels (nouveau format)
        if vol_matriciels:
            print(f"🔹 Centre {cid}: Utilisation volumes matriciels ({len(vol_matriciels)} entrées)")
            raw_v = convert_volumes_matriciels_to_classic(vol_matriciels)
        
        # Priorité 2: Volumes classiques (ancien format Excel)
        elif vol_import:
            # Source: Excel
            raw_v = {
                "sacs": float(getattr(vol_import, "sacs", 0) or 0), # Journalier
                "colis": float(getattr(vol_import, "colis", 0) or 0), # Journalier
                "colis_amana_par_sac": float(getattr(vol_import, "colis_amana_par_sac", None) or 5.0),
                "courriers_par_sac": float(getattr(vol_import, "courriers_par_sac", None) or 4500.0),
                "colis_par_collecte": float(getattr(vol_import, "colis_par_collecte", None) or 1.0),
                
                # Annuels
                "courrier_ordinaire": float(getattr(vol_import, "courrier_ordinaire", 0) or 0),
                "courrier_recommande": float(getattr(vol_import, "courrier_recommande", 0) or 0),
                "ebarkia": float(getattr(vol_import, "ebarkia", 0) or 0),
                "lrh": float(getattr(vol_import, "lrh", 0) or 0),
                "amana": float(getattr(vol_import, "amana", 0) or 0),
            }
        
        # Priorité 3: Volumes de référence (DB)
        elif vol_ref:
            # Source: DB
            raw_v = {
                "sacs": float(vol_ref.sacs or 0),
                "colis": float(vol_ref.colis or 0),
                "colis_amana_par_sac": float(vol_ref.colis_amana_par_sac or 5.0),
                "courriers_par_sac": float(vol_ref.courriers_par_sac or 4500.0),
                "colis_par_collecte": 1.0,
                
                "courrier_ordinaire": 0.0, "courrier_recommande": 0.0, "ebarkia": 0.0, "lrh": 0.0, "amana": 0.0
            }
        
        # Priorité 4: Zéro
        else:
            # Zéro
            raw_v = {
                "sacs": 0.0, "colis": 0.0, "colis_amana_par_sac": 5.0, "courriers_par_sac": 4500.0, "colis_par_collecte": 1.0,
                "courrier_ordinaire": 0.0, "courrier_recommande": 0.0, "ebarkia": 0.0, "lrh": 0.0, "amana": 0.0
            }

        # B. Préparation pour le Moteur
        # Volumes Input : Contient les valeurs journalières directes + Ratios + Idle Time
        volumes_input_dict = {
            "sacs": raw_v["sacs"],
            "colis": raw_v["colis"],
            "colis_amana_par_sac": raw_v["colis_amana_par_sac"],
            "courriers_par_sac": raw_v["courriers_par_sac"],
            "colis_par_collecte": raw_v["colis_par_collecte"],
            "idle_minutes": float(global_p.idle_minutes or 0)
        }
        
        # Volumes Annuels : Dict séparé pour le moteur
        volumes_annuels_dict = {
            "courrier_ordinaire": raw_v["courrier_ordinaire"],
            "courrier_recommande": raw_v["courrier_recommande"],
            "ebarkia": raw_v["ebarkia"],
            "lrh": raw_v["lrh"],
            "amana": raw_v["amana"],
        }

        # C. Calcul
        sim_heures_par_poste = {}
        sim_heures_net = 7.5
        etp_calc = 0.0
        heures_calc = 0.0
        
        try:
            # Regroupement des tâches (ex: tous courriers -> 1 tâche)
            taches_du_centre = tasks_by_centre.get(cid, [])
            c_tasks = regroup_tasks_for_scenarios(taches_du_centre)
            
            # Appel moteur
            sim_res = calculer_simulation(
                taches=c_tasks,
                volumes=volumes_input_dict,
                productivite=float(global_p.productivite or 100),
                heures_net_input=None, # Laisser le moteur calculer (8h * prod - idle)
                idle_minutes=float(global_p.idle_minutes or 0),
                volumes_annuels=volumes_annuels_dict
            )
            
            etp_calc = float(getattr(sim_res, "fte_calcule", 0) or 0)
            heures_calc = float(getattr(sim_res, "total_heures", 0) or 0)
            sim_heures_par_poste = getattr(sim_res, "heures_par_poste", {}) or {}
            sim_heures_net = float(getattr(sim_res, "heures_net_jour", 7.5))
            if sim_heures_net <= 0: sim_heures_net = 7.5
            
        except Exception as e:
            print(f"⚠️ Erreur calcul centre {cid}: {e}")
            etp_calc = 0.0
            heures_calc = 0.0
            sim_heures_par_poste = {}

        # D. Résultats et Détails Postes
        centre_postes_list = postes_info_by_centre.get(cid, [])
        if isinstance(centre_postes_list, dict): # Fallback si ancienne structure map
            centre_postes_list = []
            
        etp_actuel = sum(p["effectif"] for p in centre_postes_list)
        
        types = {p["type"] for p in centre_postes_list}
        cat = "MOI/MOD" if ("MOI" in types and "MOD" in types) else ("MOI" if "MOI" in types else ("MOD" if "MOD" in types else "N/A"))
        
        # Construction des détails postes
        details_postes = []
        for p in centre_postes_list:
            cp_id = p["cp_id"]
            h_calc = sim_heures_par_poste.get(cp_id, 0.0)
            p_etp_calc = h_calc / sim_heures_net
            
            details_postes.append(PosteDetail(
                label=p["label"],
                code=p["label"], # Code = Label dans le mapping actuel
                effectif_actuel=round(p["effectif"], 2),
                etp_calcule=round(p_etp_calc, 2),
                ecart=round(p_etp_calc - p["effectif"], 2),
                type_poste=p.get("type", "")
            ))
        
        results.append(CentreResultRow(
            centre_id=cid,
            centre_label=centre_data["label"],
            categorie=cat,
            etp_actuel=round(etp_actuel, 2),
            etp_calcule=round(etp_calc, 2),
            ecart=round(etp_calc - etp_actuel, 2),
            heures_calc=heures_calc,
            details_postes=details_postes        
        ))

    # 7. KPI Globaux
    total_actuel = sum(r.etp_actuel for r in results)
    total_calc = sum(r.etp_calcule for r in results)
    
    kpis = DirectionKPIs(
        nb_centres=len(results),
        etp_actuel=round(total_actuel, 2),
        etp_calcule=round(total_calc, 2),
        ecart_global=round(total_calc - total_actuel, 2)
    )
    
    # Charts
    dist_map = {}
    for r in results: dist_map[r.categorie] = dist_map.get(r.categorie, 0) + r.etp_calcule
    chart_dist = [ChartDataPoint(name=k, value=round(v, 2)) for k, v in dist_map.items()]
    
    top_5 = sorted(results, key=lambda x: x.ecart, reverse=True)[:5]
    chart_top = [ChartDataPoint(name=r.centre_label, value=r.ecart) for r in top_5]
    
    report = ImportReport(
        total_lignes=len(request.volumes),
        matched_centres=len(matched_volumes),
        unknown_centres=list(set(unknown_labels)),
        ignored_centres=len(request.volumes) - len(matched_volumes) - len(unknown_labels)
    )

    print(f"✅ [V2] Simulation terminée. {len(results)} centres simulés.")

    return DirectionSimResponse(
        direction_id=request.direction_id,
        direction_label=direction["label"],
        mode=request.mode,
        kpis=kpis,
        rows=results,
        chart_distribution_moi_mod=chart_dist,
        chart_top_gaps=chart_top,
        report=report
    )
