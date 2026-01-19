from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.simulation import calculer_simulation
from app.schemas.direction_sim import NationalSimRequest, NationalSimResponse, NationalRegionStats, NationalKPIs

# Mapping static lat/lng for known directions (mock fallback)
COORD_MAP = {
    "CASA": (33.5731, -7.5898),
    "FES": (34.0181, -5.0078),
    "MARRAKECH": (31.6295, -7.9811),
    "SUD": (30.4278, -9.5981), # Agadir aprox or Laayoune
    "LAAYOUNE": (27.1567, -13.2021),
    "TANGER": (35.7595, -5.8340),
    "RABAT": (34.0209, -6.8416),
    "ORIENTAL": (34.6814, -1.9086),
    "BENI": (32.3394, -6.3608),
    "DRAA": (30.9335, -6.9370),
    "SIEGE": (33.9716, -6.8498)
}

def get_coords(name: str):
    name_upper = name.upper()
    for k, v in COORD_MAP.items():
        if k in name_upper:
            return v
    return (31.7917, -7.0926) # Default Morocco center

def process_national_simulation(db: Session, request: NationalSimRequest) -> NationalSimResponse:
    print(f"🔹 [NATIONAL V3] Démarrage simulation nationale - Étape par étape")
    
    # ========================================
    # ÉTAPE 1 : Calculer l'EFFECTIF ACTUEL TOTAL
    # ========================================
    # L'effectif actuel = somme de tous les effectifs de tous les centres
    
    sql_effectif_total = """
        SELECT SUM(cp.effectif_actuel) as total_effectif
        FROM dbo.centre_postes cp
    """
    
    result = db.execute(text(sql_effectif_total)).mappings().first()
    total_etp_actuel = float(result['total_effectif'] or 0)
    
    print(f"✅ ÉTAPE 1 - Effectif Actuel Total: {total_etp_actuel}")
    
    # ========================================
    # ÉTAPE 2 : Calculer l'EFFECTIF RECOMMANDÉ
    # ========================================
    # On calcule uniquement pour les centres qui ont des volumes importés
    
    # 2.1 Récupérer tous les centres qui ont des volumes
    sql_centres_avec_volumes = """
        SELECT DISTINCT cvr.centre_id
        FROM dbo.centre_volumes_ref cvr
        WHERE cvr.sacs > 0 OR cvr.colis > 0 OR cvr.courrier_ordinaire > 0 
           OR cvr.courrier_recommande > 0 OR cvr.ebarkia > 0 OR cvr.lrh > 0 OR cvr.amana > 0
    """
    
    centres_avec_volumes = db.execute(text(sql_centres_avec_volumes)).fetchall()
    centre_ids = [r[0] for r in centres_avec_volumes]
    
    print(f"✅ ÉTAPE 2 - Centres avec volumes: {len(centre_ids)}")
    
    total_etp_recommande = 0.0
    total_volumes = {"sacs": 0, "colis": 0, "courrier": 0, "autres": 0}
    
    if centre_ids:
        c_ids_str = ",".join(str(cid) for cid in centre_ids)
        
        # 2.2 Récupérer les tâches pour ces centres
        sql_tasks = f"""
            SELECT t.*, 
                   p.label as nom_poste, 
                   cp.centre_id
            FROM dbo.taches t
            JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
            JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id IN ({c_ids_str})
        """
        t_rows = db.execute(text(sql_tasks)).mappings().all()
        tasks_by_centre = {cid: [] for cid in centre_ids}
        for r in t_rows:
            tasks_by_centre[r.centre_id].append(dict(r))
        
        # 2.3 Récupérer les volumes
        sql_vols = f"""
            SELECT centre_id, 
                   sacs,
                   colis,
                   courrier_ordinaire as courrier_o,
                   courrier_recommande as courrier_r,
                   ebarkia,
                   lrh,
                   amana
            FROM dbo.centre_volumes_ref 
            WHERE centre_id IN ({c_ids_str})
        """
        v_rows = db.execute(text(sql_vols)).mappings().all()
        vol_map = {r['centre_id']: dict(r) for r in v_rows}
        
        # 2.4 Calculer l'ETP pour chaque centre
        for cid in centre_ids:
            ctr_tasks = tasks_by_centre.get(cid, [])
            ctr_vol = vol_map.get(cid)
            
            if not ctr_tasks:
                print(f"⚠️ Centre {cid}: Pas de tâches trouvées")
                continue
            
            if not ctr_vol:
                print(f"⚠️ Centre {cid}: Pas de volumes trouvés")
                continue
            
            # Préparer les volumes EXACTEMENT comme dans direction_v2_service
            # Volumes Input : Contient les valeurs journalières directes + Ratios
            volumes_input_dict = {
                "sacs": float(ctr_vol.get("sacs") or 0),
                "colis": float(ctr_vol.get("colis") or 0),
                "colis_amana_par_sac": 5.0,  # Valeur par défaut
                "courriers_par_sac": 4500.0,  # Valeur par défaut
                "colis_par_collecte": 1.0,
                "idle_minutes": 0.0
            }
            
            # Volumes Annuels : Dict séparé pour le moteur
            volumes_annuels_dict = {
                "courrier_ordinaire": float(ctr_vol.get("courrier_o") or 0),
                "courrier_recommande": float(ctr_vol.get("courrier_r") or 0),
                "ebarkia": float(ctr_vol.get("ebarkia") or 0),
                "lrh": float(ctr_vol.get("lrh") or 0),
                "amana": float(ctr_vol.get("amana") or 0),
            }
            
            # Accumuler les volumes totaux
            total_volumes["sacs"] += volumes_input_dict["sacs"]
            total_volumes["colis"] += volumes_input_dict["colis"]
            total_volumes["courrier"] += volumes_annuels_dict["courrier_ordinaire"] + volumes_annuels_dict["courrier_recommande"]
            total_volumes["autres"] += volumes_annuels_dict["ebarkia"] + volumes_annuels_dict["lrh"] + volumes_annuels_dict["amana"]
            
            # Appliquer le moteur de simulation EXACTEMENT comme direction_v2_service
            try:
                sim_res = calculer_simulation(
                    taches=ctr_tasks,
                    volumes=volumes_input_dict,
                    productivite=float(request.productivite or 100),
                    heures_net_input=None,  # Laisser le moteur calculer
                    idle_minutes=0.0,
                    volumes_annuels=volumes_annuels_dict
                )
                
                # Récupérer l'ETP calculé comme dans direction_v2_service
                etp_calc = float(getattr(sim_res, "fte_calcule", 0) or 0)
                total_etp_recommande += etp_calc
                
                print(f"  ✅ Centre {cid}: {etp_calc} ETP calculés")
                
            except Exception as e:
                import traceback
                print(f"⚠️ Erreur simulation centre {cid}: {e}")
                traceback.print_exc()
                continue
    
    # Appliquer le scénario si "Optimisé"
    if request.scenario == "Optimisé":
        total_etp_recommande *= 0.95
        print(f"✅ Scénario Optimisé appliqué (-5%)")
    
    print(f"✅ ÉTAPE 2 - Effectif Recommandé Total: {total_etp_recommande}")
    
    # ========================================
    # ÉTAPE 3 : Calculer les données par direction
    # ========================================
    print(f"🔹 ÉTAPE 3 - Calcul des données par direction...")
    
    surplus_deficit = total_etp_recommande - total_etp_actuel
    taux_moyen = (total_etp_actuel / total_etp_recommande * 100) if total_etp_recommande > 0 else 100.0
    
    regions_data = []
    
    # Récupérer toutes les directions
    directions = db.execute(text("SELECT id, label, code FROM dbo.directions ORDER BY label")).mappings().all()
    
    for d in directions:
        d_id = d.id
        d_label = d.label
        d_code = d.code or d.label[:3].upper()
        
        # 3.1 Récupérer les centres de cette direction
        centres_dir = db.execute(
            text("SELECT id FROM dbo.centres WHERE direction_id = :did"),
            {"did": d_id}
        ).fetchall()
        
        nb_centres = len(centres_dir)
        centre_ids_dir = [c[0] for c in centres_dir]
        
        # 3.2 Calculer l'effectif actuel de cette direction
        etp_actuel_dir = 0.0
        if centre_ids_dir:
            result_actuel = db.execute(
                text(f"""
                    SELECT SUM(cp.effectif_actuel) as total
                    FROM dbo.centre_postes cp
                    WHERE cp.centre_id IN ({','.join(str(cid) for cid in centre_ids_dir)})
                """)
            ).fetchone()
            etp_actuel_dir = float(result_actuel[0] or 0)
        
        # 3.3 Calculer l'effectif recommandé pour cette direction
        # On récupère uniquement les centres qui ont des volumes
        etp_recommande_dir = 0.0
        
        if centre_ids_dir:
            # Récupérer les centres avec volumes dans cette direction
            centres_avec_vol = db.execute(
                text(f"""
                    SELECT DISTINCT cvr.centre_id
                    FROM dbo.centre_volumes_ref cvr
                    WHERE cvr.centre_id IN ({','.join(str(cid) for cid in centre_ids_dir)})
                      AND (cvr.sacs > 0 OR cvr.colis > 0 OR cvr.courrier_ordinaire > 0 
                           OR cvr.courrier_recommande > 0 OR cvr.ebarkia > 0 OR cvr.lrh > 0 OR cvr.amana > 0)
                """)
            ).fetchall()
            
            centres_vol_ids = [c[0] for c in centres_avec_vol]
            
            if centres_vol_ids:
                c_ids_str = ",".join(str(cid) for cid in centres_vol_ids)
                
                # Récupérer les tâches
                sql_tasks = f"""
                    SELECT t.*, p.label as nom_poste, cp.centre_id
                    FROM dbo.taches t
                    JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
                    JOIN dbo.postes p ON p.id = cp.poste_id
                    WHERE cp.centre_id IN ({c_ids_str})
                """
                t_rows = db.execute(text(sql_tasks)).mappings().all()
                tasks_by_centre_dir = {cid: [] for cid in centres_vol_ids}
                for r in t_rows:
                    tasks_by_centre_dir[r.centre_id].append(dict(r))
                
                # Récupérer les volumes
                sql_vols = f"""
                    SELECT centre_id, sacs, colis,
                           courrier_ordinaire as courrier_o,
                           courrier_recommande as courrier_r,
                           ebarkia, lrh, amana
                    FROM dbo.centre_volumes_ref 
                    WHERE centre_id IN ({c_ids_str})
                """
                v_rows = db.execute(text(sql_vols)).mappings().all()
                vol_map_dir = {r['centre_id']: dict(r) for r in v_rows}
                
                # Calculer pour chaque centre
                for cid in centres_vol_ids:
                    ctr_tasks = tasks_by_centre_dir.get(cid, [])
                    ctr_vol = vol_map_dir.get(cid)
                    
                    if not ctr_tasks or not ctr_vol:
                        continue
                    
                    volumes_input_dict = {
                        "sacs": float(ctr_vol.get("sacs") or 0),
                        "colis": float(ctr_vol.get("colis") or 0),
                        "colis_amana_par_sac": 5.0,
                        "courriers_par_sac": 4500.0,
                        "colis_par_collecte": 1.0,
                        "idle_minutes": 0.0
                    }
                    
                    volumes_annuels_dict = {
                        "courrier_ordinaire": float(ctr_vol.get("courrier_o") or 0),
                        "courrier_recommande": float(ctr_vol.get("courrier_r") or 0),
                        "ebarkia": float(ctr_vol.get("ebarkia") or 0),
                        "lrh": float(ctr_vol.get("lrh") or 0),
                        "amana": float(ctr_vol.get("amana") or 0),
                    }
                    
                    try:
                        sim_res = calculer_simulation(
                            taches=ctr_tasks,
                            volumes=volumes_input_dict,
                            productivite=float(request.productivite or 100),
                            heures_net_input=None,
                            idle_minutes=0.0,
                            volumes_annuels=volumes_annuels_dict
                        )
                        
                        etp_calc = float(getattr(sim_res, "fte_calcule", 0) or 0)
                        etp_recommande_dir += etp_calc
                        
                    except Exception as e:
                        print(f"⚠️ Erreur simulation centre {cid} (direction {d_label}): {e}")
                        continue
        
        # Appliquer le scénario si "Optimisé"
        if request.scenario == "Optimisé":
            etp_recommande_dir *= 0.95
        
        # Calculer le taux d'occupation
        taux_occupation = (etp_actuel_dir / etp_recommande_dir * 100) if etp_recommande_dir > 0 else 100.0
        
        # Obtenir les coordonnées
        lat, lng = get_coords(d_label)
        
        reg_stat = NationalRegionStats(
            id=d_id,
            code=d_code,
            nom=d_label,
            centres=nb_centres,
            etpActuel=round(etp_actuel_dir, 2),
            etpRecommande=round(etp_recommande_dir, 2),
            tauxOccupation=round(taux_occupation, 1),
            lat=lat,
            lng=lng
        )
        regions_data.append(reg_stat)
        
        print(f"  ✅ Direction {d_label}: {nb_centres} centres, Actuel={etp_actuel_dir:.2f}, Calculé={etp_recommande_dir:.2f}")
    
    print(f"✅ ÉTAPE 3 - Données par direction calculées")
    
    # KPIs Nationaux
    kpis = NationalKPIs(
        etpActuelTotal=round(total_etp_actuel, 2),
        etpRecommandeTotal=round(total_etp_recommande, 2),
        surplusDeficit=round(surplus_deficit, 2),
        tauxProductiviteMoyen=round(taux_moyen, 1),
        fte_calcule=round(total_etp_recommande, 2),
        volumes=total_volumes
    )
    
    print(f"✅ Simulation nationale terminée:")
    print(f"   - Effectif Actuel: {kpis.etpActuelTotal}")
    print(f"   - Effectif Recommandé: {kpis.etpRecommandeTotal}")
    print(f"   - Écart: {kpis.surplusDeficit}")
    
    return NationalSimResponse(kpisNationaux=kpis, regionsData=regions_data)
