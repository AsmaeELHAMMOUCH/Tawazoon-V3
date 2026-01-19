# backend/app/services/national_simulation_service.py

from typing import Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import text

# Moteur de calcul central
from app.services.simulation import calculer_simulation
from app.services.simulation_shared import regroup_tasks_for_scenarios
from app.services.direction_v2_service import (
    normalize_string,
    convert_volumes_matriciels_to_classic
)

# Schemas
from app.schemas.direction_sim import VolumeMatriciel


def process_national_simulation(db: Session, volumes_matriciels: List[VolumeMatriciel], global_params: dict) -> dict:
    """
    Simulation nationale avec volumes matriciels.
    
    Logique:
    1. Récupère TOUS les centres
    2. Pour chaque centre avec volumes matriciels, lance la simulation
    3. Agrège les résultats par direction et au niveau national
    """
    print(f"🌍 [NATIONAL] DEBUT Simulation Nationale")
    print(f"🌍 [NATIONAL] {len(volumes_matriciels)} volumes matriciels reçus")
    
    # 1. Grouper les volumes par centre
    matched_volumes_matriciels: Dict[int, List] = {}
    
    for vol_mat in volumes_matriciels:
        cid = vol_mat.centre_id
        if cid:
            if cid not in matched_volumes_matriciels:
                matched_volumes_matriciels[cid] = []
            matched_volumes_matriciels[cid].append(vol_mat)
    
    print(f"🌍 [NATIONAL] Volumes groupés pour {len(matched_volumes_matriciels)} centres")
    
    # 2. Récupérer tous les centres avec leurs directions
    centre_ids = list(matched_volumes_matriciels.keys())
    
    if not centre_ids:
        return {
            "centres_simules": 0,
            "directions": [],
            "kpis_nationaux": {
                "etp_total": 0,
                "heures_totales": 0,
                "centres_total": 0
            }
        }
    
    # Récupérer les centres avec leurs directions
    ids_str = ",".join(str(cid) for cid in centre_ids)
    
    sql_centres = f"""
        SELECT c.id, c.label, c.direction_id, d.label as direction_label
        FROM dbo.centres c
        LEFT JOIN dbo.directions d ON d.id = c.direction_id
        WHERE c.id IN ({ids_str})
    """
    
    centres_rows = db.execute(text(sql_centres)).mappings().all()
    centres_map = {r.id: dict(r) for r in centres_rows}
    
    # 3. Récupérer les tâches pour tous les centres
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
    
    t_rows = db.execute(text(sql_tasks)).mappings().all()
    tasks_by_centre = {cid: [] for cid in centre_ids}
    for r in t_rows:
        tasks_by_centre[r.centre_id].append(dict(r))
    
    # 4. Boucle de simulation par centre
    results_by_direction = {}
    total_etp = 0
    total_heures = 0
    centres_simules = 0
    
    for cid in centre_ids:
        centre_data = centres_map.get(cid)
        if not centre_data:
            continue
        
        vol_matriciels = matched_volumes_matriciels.get(cid)
        if not vol_matriciels:
            continue
        
        # Convertir volumes matriciels
        print(f"🌍 Centre {cid}: Utilisation volumes matriciels ({len(vol_matriciels)} entrées)")
        raw_v = convert_volumes_matriciels_to_classic(vol_matriciels)
        
        # Préparer volumes pour le moteur
        volumes_input_dict = {
            "sacs": raw_v["sacs"],
            "colis": raw_v["colis"],
            "colis_amana_par_sac": raw_v["colis_amana_par_sac"],
            "courriers_par_sac": raw_v["courriers_par_sac"],
            "colis_par_collecte": raw_v["colis_par_collecte"],
            "idle_minutes": float(global_params.get("idle_minutes", 0))
        }
        
        volumes_annuels_dict = {
            "courrier_ordinaire": raw_v["courrier_ordinaire"],
            "courrier_recommande": raw_v["courrier_recommande"],
            "ebarkia": raw_v["ebarkia"],
            "lrh": raw_v["lrh"],
            "amana": raw_v["amana"],
        }
        
        # Simulation
        try:
            taches_du_centre = tasks_by_centre.get(cid, [])
            c_tasks = regroup_tasks_for_scenarios(taches_du_centre)
            
            sim_res = calculer_simulation(
                taches=c_tasks,
                volumes=volumes_input_dict,
                productivite=float(global_params.get("productivite", 100)),
                heures_net_input=None,
                idle_minutes=float(global_params.get("idle_minutes", 0)),
                volumes_annuels=volumes_annuels_dict
            )
            
            etp_calc = float(getattr(sim_res, "fte_calcule", 0) or 0)
            heures_calc = float(getattr(sim_res, "total_heures", 0) or 0)
            
            # Agréger par direction
            direction_id = centre_data.get("direction_id")
            direction_label = centre_data.get("direction_label", "Sans Direction")
            
            if direction_id not in results_by_direction:
                results_by_direction[direction_id] = {
                    "direction_id": direction_id,
                    "direction_label": direction_label,
                    "etp_total": 0,
                    "heures_totales": 0,
                    "centres_count": 0
                }
            
            results_by_direction[direction_id]["etp_total"] += etp_calc
            results_by_direction[direction_id]["heures_totales"] += heures_calc
            results_by_direction[direction_id]["centres_count"] += 1
            
            total_etp += etp_calc
            total_heures += heures_calc
            centres_simules += 1
            
        except Exception as e:
            print(f"⚠️ Erreur calcul centre {cid}: {e}")
    
    # 5. Préparer la réponse
    directions_list = list(results_by_direction.values())
    
    print(f"✅ [NATIONAL] Simulation terminée. {centres_simules} centres simulés.")
    
    return {
        "centres_simules": centres_simules,
        "directions": directions_list,
        "kpis_nationaux": {
            "etp_total": round(total_etp, 2),
            "heures_totales": round(total_heures, 2),
            "centres_total": centres_simules,
            "directions_total": len(directions_list)
        }
    }
