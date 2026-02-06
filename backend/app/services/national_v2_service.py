from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.services.simulation import calculer_simulation
from app.schemas.direction_sim import NationalSimRequest, NationalSimResponse, NationalRegionStats, NationalKPIs, NationalCentreStats, NationalPosteStats

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
    
    total_etp_recommande = 0.0
    total_volumes = {"sacs": 0, "colis": 0, "courrier": 0, "autres": 0}
    
    # Listes pour les résultats détaillés
    all_centres_stats: List[NationalCentreStats] = []
    all_postes_stats: List[NationalPosteStats] = []

    # MODE 1 : DATA DRIVEN (Via Import Excel) - Prioritaire
    if request.mode == "data_driven":
        print(f"🔹 MODE DATA-DRIVEN ACTIVÉ (Centres importés: {len(request.centres_data) if request.centres_data else 0})")
        
        # Initialiser les résultats pour éviter le fallback DB lors de l'agrégation
        if not hasattr(request, "_sim_results"): 
            request._sim_results = {}
            
        if not request.centres_data:
            print("⚠️ AVERTISSEMENT: Aucune donnée centre fournie en mode Data-Driven.")

        # Pré-chargement de toutes les tâches pour éviter N requêtes
        # TENTATIVE DE RÉSOLUTION DES IDs MANQUANTS
        valid_ids = set()
        missing_id_labels = set()
        
        for c in request.centres_data:
            if c.centre_id:
                valid_ids.add(c.centre_id)
            elif c.centre_label:
                # Nettoyage basique (supprimer (ID: ...))
                import re
                clean = re.sub(r'\s*\(ID:\s*\d+\)', '', c.centre_label, flags=re.IGNORECASE).strip()
                missing_id_labels.add(clean)
        
        if missing_id_labels:
            print(f"🔍 Tentative de résolution pour {len(missing_id_labels)} centres sans ID...")
            sanitized_labels = [l.replace("'", "''") for l in missing_id_labels if l]
            if sanitized_labels:
                labels_sql = ",".join(f"'{l}'" for l in sanitized_labels)
                # Recherche insensible au sens large souvent implicite ou via collation, ici on espère un match exact
                sql_lookup = f"SELECT id, label FROM dbo.centres WHERE label IN ({labels_sql})"
                try:
                    found_rows = db.execute(text(sql_lookup)).mappings().all()
                    # Map UPPER(Label) -> ID
                    name_to_id = {row.label.upper().strip(): row.id for row in found_rows}
                    
                    for c in request.centres_data:
                        if not c.centre_id and c.centre_label:
                            clean_lbl = re.sub(r'\s*\(ID:\s*\d+\)', '', c.centre_label, flags=re.IGNORECASE).strip()
                            found_id = name_to_id.get(clean_lbl.upper())
                            if found_id:
                                c.centre_id = found_id
                                valid_ids.add(found_id)
                                # print(f"   ✅ ID trouvé pour '{c.centre_label}': {found_id}")
                except Exception as e:
                    print(f"⚠️ Erreur lors de la résolution des noms: {e}")

        c_ids_imported = list(valid_ids)
        
        tasks_map = {}
        centres_info_map = {}
        cp_info_map = {} # Map CentrePosteID -> Details

        if c_ids_imported:
             c_ids_str = ",".join(str(cid) for cid in c_ids_imported)
             
             # 1. Infos Centres (pour le détail Centre)
             sql_c = f"""
                SELECT c.id, c.label, c.typologie, d.id as direction_id, d.label as direction_label,
                       (SELECT SUM(effectif_actuel) FROM dbo.centre_postes WHERE centre_id = c.id) as etp_actuel
                FROM dbo.centres c
                LEFT JOIN dbo.directions d ON c.direction_id = d.id
                WHERE c.id IN ({c_ids_str})
             """
             c_rows = db.execute(text(sql_c)).mappings().all()
             centres_info_map = {r.id: dict(r) for r in c_rows}

             # 2. Tâches + Infos CentrePostes (pour le détail Poste)
             sql_tasks = f"""
                SELECT t.*, 
                       p.label as nom_poste, 
                       p.type_poste, -- Type de poste (MOD/MOI/APS)
                       cp.centre_id,
                       cp.id as centre_poste_id,
                       cp.effectif_actuel as cp_actuel
                FROM dbo.taches t
                JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
                JOIN dbo.postes p ON p.id = cp.poste_id
                WHERE cp.centre_id IN ({c_ids_str})
             """
             t_rows = db.execute(text(sql_tasks)).mappings().all()
             
             for r in t_rows:
                 cid = r.centre_id
                 if cid not in tasks_map:
                     tasks_map[cid] = []
                 tasks_map[cid].append(dict(r))
                 
                 # Stocker les infos du poste (une seule fois par CP ID)
                 cpid = r.centre_poste_id
                 if cpid not in cp_info_map:
                     cp_info_map[cpid] = {
                         "label": r.nom_poste,
                         "type": r.type_poste,
                         "centre_id": cid,
                         "actuel": float(r.cp_actuel or 0)
                     }

        for centre_data in request.centres_data:
            cid = centre_data.centre_id
            
            # Si pas d'ID, on skip (ou on pourrait essayer de trouver par label, mais risqué ici)
            if not cid:
                continue

            ctr_tasks = tasks_map.get(cid, [])
            c_info = centres_info_map.get(cid)
            
            # Si le centre n'existe pas en base, on ne peut pas le simuler correctement
            if not c_info:
                continue
                
            tasks_list = ctr_tasks or [] # On autorise liste vide (donnera 0 ETP calculé)

            # --- Agrégation des Volumes Matriciels ---
            # Conversion : Matrice -> Clés attendues par le moteur
            vol_agg = {
                "sacs": 0.0,
                "colis": 0.0, # Amana Arrivée
                "courrier_o": 0.0,
                "courrier_r": 0.0, 
                "ebarkia": 0.0,
                "lrh": 0.0,
                "amana": 0.0 # Amana Départ / Global
            }
            
            # Paramètres spécifiques du centre
            params = centre_data.params or {}

            for v in centre_data.volumes:
                val = float(v.volume or 0)
                if val <= 0: continue
                
                # Flux 1: Amana
                if v.flux_id == 1:
                    if v.sens_id == 1: # Arrivée
                        vol_agg["colis"] += val
                    else: # Départ (3) ou Autre
                        vol_agg["amana"] += val
                
                # Flux 2: CO
                elif v.flux_id == 2:
                    vol_agg["courrier_o"] += val
                
                # Flux 3: CR
                elif v.flux_id == 3:
                    vol_agg["courrier_r"] += val
                
                # Flux 4: E-Barkia
                elif v.flux_id == 4:
                    vol_agg["ebarkia"] += val
                
                # Flux 5: LRH
                elif v.flux_id == 5:
                    vol_agg["lrh"] += val
            
            # --- Préparation Inputs Simulation ---
            volumes_input_dict = {
                "sacs": vol_agg["sacs"],
                "colis": vol_agg["colis"],
                "colis_amana_par_sac": float(params.colis_amana_par_sac or 5.0),
                "courriers_par_sac": float(params.courriers_co_par_sac or 4500.0), # Mapping param
                "colis_par_collecte": 1.0,
                "idle_minutes": float(params.temps_mort or request.global_params.idle_minutes if request.global_params else 0.0)
            }
            
            volumes_annuels_dict = {
                "courrier_ordinaire": vol_agg["courrier_o"],
                "courrier_recommande": vol_agg["courrier_r"],
                "ebarkia": vol_agg["ebarkia"],
                "lrh": vol_agg["lrh"],
                "amana": vol_agg["amana"],
            }
            
            # Stats Volumes pour KPIs
            total_volumes["sacs"] += volumes_input_dict["sacs"]
            total_volumes["colis"] += volumes_input_dict["colis"]
            total_volumes["courrier"] += volumes_annuels_dict["courrier_ordinaire"] + volumes_annuels_dict["courrier_recommande"]
            total_volumes["autres"] += volumes_annuels_dict["ebarkia"] + volumes_annuels_dict["lrh"] + volumes_annuels_dict["amana"]

            try:
                # Utilisation des params du centre ou globaux
                prod = float(params.productivite or (request.global_params.productivite if request.global_params else 100.0))
                
                sim_res = calculer_simulation(
                    taches=tasks_list,
                    volumes=volumes_input_dict,
                    productivite=prod,
                    heures_net_input=None, # Calculé autos
                    idle_minutes=volumes_input_dict["idle_minutes"],
                    volumes_annuels=volumes_annuels_dict
                )
                
                etp_calc = float(getattr(sim_res, "fte_calcule", 0) or 0)
                heures_calc = float(getattr(sim_res, "total_heures", 0) or 0) # ou heures_totales selon implementation
                total_etp_recommande += etp_calc
                
                # --- UPDATE TEMPORAIRE POUR LA RÉPARTITION ---
                request._sim_results[cid] = etp_calc
                
                # --- CONSTRUCTION DES RÉSULTATS DÉTAILLÉS ---
                
                # 1. Détail Centre
                ct_stat = NationalCentreStats(
                    id=cid,
                    nom=c_info.get('label', 'N/A'),
                    direction_id=c_info.get('direction_id', 0),
                    direction_label=c_info.get('direction_label', 'N/A'),
                    typologie=c_info.get('typologie') or 'N/A',
                    etp_actuel=float(c_info.get('etp_actuel') or 0),
                    etp_calcule=etp_calc,
                    heures_calculees=heures_calc,
                    ecart=etp_calc - float(c_info.get('etp_actuel') or 0)
                )
                all_centres_stats.append(ct_stat)
                
                # 2. Détail Postes (basé sur heures_par_poste)
                # On itère sur les CPIDs retournés par le moteur
                # Attention: sim_res.heures_par_poste peut être incomplet si pas d'heures.
                # Mais on veut lister tous les postes du centre, même si 0 heures ?
                # Pour l'instant on liste ceux qui ont des heures (actifs dans la simu)
                
                heures_net_jour = getattr(sim_res, "heures_net_jour", 8.0) or 8.0
                
                # On veut aussi inclure les postes présents mais avec 0 heures calculées
                # On utilise cp_info_map pour ce centre
                cps_processed = set()
                
                # A. Postes avec Heures Calculées
                for cpid, heures in (sim_res.heures_par_poste or {}).items():
                    if cpid in cp_info_map:
                        cp_inf = cp_info_map[cpid]
                        # Vérification centre (par sécurité)
                        if cp_inf['centre_id'] == cid:
                            etp_p_calc = heures / heures_net_jour if heures_net_jour > 0 else 0
                            
                            all_postes_stats.append(NationalPosteStats(
                                poste_label=cp_inf['label'],
                                type_poste=cp_inf['type'] or "N/A",
                                centre_id=cid,
                                nom_centre=c_info.get('label', 'N/A'),
                                etp_actuel=cp_inf['actuel'],
                                etp_calcule=round(etp_p_calc, 2),
                                ecart=round(etp_p_calc - cp_inf['actuel'], 2)
                            ))
                            cps_processed.add(cpid)

                # B. Postes sans Heures (optionnel, mais mieux pour comparer l'existant)
                # On parcourt cp_info_map pour trouver les autres postes de ce centre
                # (Attention performance si map est grosse : on itère tout)
                # Optimisation : On pourrait avoir cp_ids_by_centre[cid]
                # Pour l'instant, on laisse comme ça car simuler des milliers de postes est rare.
                # Amélioration: on filtre dans la boucle t_rows plus haut.
                
            except Exception as e:
                # print(f"⚠️ Erreur simu centre {cid}: {e}")
                pass

    # MODE 2 : DATABASE (Legacy)
    else:
        # 2.1 Récupérer tous les centres qui ont des volumes
        sql_centres_avec_volumes = """
            SELECT DISTINCT cvr.centre_id
            FROM dbo.centre_volumes_ref cvr
            WHERE cvr.sacs > 0 OR cvr.colis > 0 OR cvr.courrier_ordinaire > 0 
               OR cvr.courrier_recommande > 0 OR cvr.ebarkia > 0 OR cvr.lrh > 0 OR cvr.amana > 0
        """
        
        centres_avec_volumes = db.execute(text(sql_centres_avec_volumes)).fetchall()
        centre_ids = [r[0] for r in centres_avec_volumes]
        
        print(f"✅ ÉTAPE 2 (DB) - Centres avec volumes: {len(centre_ids)}")
        
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
                
                if not ctr_tasks or not ctr_vol:
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
                    
                except Exception as e:
                    continue
    
    # Appliquer le scénario si "Optimisé"
    if request.scenario == "Optimisé":
        total_etp_recommande *= 0.95
    
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
            # MODE 1 : DATA DRIVEN (Utilisation des résultats pré-calculés)
            if hasattr(request, "_sim_results"):
                for cid in centre_ids_dir:
                    etp_recommande_dir += request._sim_results.get(cid, 0.0)
            
            # MODE 2 : DATABASE (Recalcul depuis la base)
            else:
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
    print(f"   - Détails Centres: {len(all_centres_stats)} lignes")
    print(f"   - Détails Postes: {len(all_postes_stats)} lignes")
    
    return NationalSimResponse(
        kpisNationaux=kpis, 
        regionsData=regions_data,
        centres=all_centres_stats,
        postes=all_postes_stats
    )
