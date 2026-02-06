# backend/app/services/national_simulation_service.py

from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

# Moteur de calcul (DATA DRIVEN)
from app.services.simulation_data_driven import calculer_simulation_centre_data_driven
from app.schemas.volumes_ui import VolumesUIInput, VolumeItem, GuichetVolumesInput

# Schemas
from app.schemas.direction_sim import VolumeMatriciel, CentreSimulationData, CentreParams
from app.models.db_models import CentrePoste, Poste

# Mappings (ID -> CODE)
FLUX_ID_MAP = {1: "AMANA", 2: "CO", 3: "CR", 4: "E-BARKIA", 5: "LRH"}
SENS_ID_MAP = {1: "ARRIVEE", 2: "GUICHET", 3: "DEPART"}
SEGMENT_ID_MAP = {
    1: "GLOBAL", 
    2: "PARTICULIER", 
    3: "PROFESSIONNEL", 
    4: "DISTRIBUTION", 
    5: "AXES",
    6: "DEPOT", 
    7: "RECUP" 
}

def process_national_simulation(
    db: Session, 
    volumes_matriciels: List[VolumeMatriciel], 
    global_params: dict,
    centres_data: List[CentreSimulationData] = None
) -> dict:
    """
    Simulation nationale avec volumes matriciels via le moteur Data-Driven.
    Supporte l'injection de paramètres spécifiques par centre via 'centres_data'.
    """
    print(f"🌍 [NATIONAL] DEBUT Simulation Nationale (Moteur Data-Driven)")
    
    # --- 1. Normalisation des entrées (Payload par Centre ID) ---
    # Structure: { cid: { "volumes": [Vol], "params": CentreParams|None } }
    centres_payload = {} 

    if centres_data and len(centres_data) > 0:
        print(f"🌍 [NATIONAL] Mode Hiérarchique: {len(centres_data)} centres reçus avec paramètres.")
        
        # On doit récupérer les IDs des centres via leurs labels
        # Optimisation: Récupérer tous les centres actifs d'un coup
        all_centres_rows = db.execute(text("SELECT id, label FROM dbo.centres")).mappings().all()
        
        # Map de normalisation pour matching robuste
        def norm(s): return str(s).strip().upper().replace(" ", "").replace("-", "")
        
        label_to_id = { norm(r['label']): r['id'] for r in all_centres_rows }
        
        for c_data in centres_data:
            # Priorité à l'ID explicite s'il est présent
            cid = c_data.centre_id
            
            if not cid:
                # Fallback: Matching par Label
                lbl_raw = c_data.centre_label
                lid = norm(lbl_raw)
                cid = label_to_id.get(lid)
            
            if cid:
                centres_payload[cid] = {
                    "volumes": c_data.volumes,
                    "params": c_data.params
                }
            else:
                print(f"⚠️ Centre non trouvé: ID={c_data.centre_id}, Label='{c_data.centre_label}'")
                
    elif volumes_matriciels and len(volumes_matriciels) > 0:
        print(f"🌍 [NATIONAL] Mode Plat (Legacy): {len(volumes_matriciels)} volumes matriciels.")
        for vol_mat in volumes_matriciels:
            cid = vol_mat.centre_id
            if cid:
                if cid not in centres_payload:
                    centres_payload[cid] = { "volumes": [], "params": None }
                centres_payload[cid]["volumes"].append(vol_mat)
    
    else:
        print("🌍 [NATIONAL] Aucun volume fourni.")
    
    centre_ids = list(centres_payload.keys())
    print(f"🌍 [NATIONAL] {len(centre_ids)} centres identifiés pour simulation.")
    
    if not centre_ids:
        return _empty_response()

    # --- 2. Récupérer métadonnées des centres (Direction, Catégorie) ---
    ids_str = ",".join(str(cid) for cid in centre_ids)
    sql_centres = f"""
        SELECT c.id, c.label, c.direction_id, d.label as direction_label, cat.label as categorie_label,
               COALESCE((SELECT SUM(effectif_actuel) FROM dbo.centre_postes WHERE centre_id = c.id), 0) as etp_actuel_bulk,
               COALESCE(c.APS, 0) as aps_ext
        FROM dbo.centres c
        LEFT JOIN dbo.directions d ON d.id = c.direction_id
        LEFT JOIN dbo.categories cat ON cat.id = c.categorie_id
        WHERE c.id IN ({ids_str})
    """
    centres_rows = db.execute(text(sql_centres)).mappings().all()
    centres_map = {r.id: dict(r) for r in centres_rows}
    
    # --- 3. Boucle de Simulation ---
    results_by_direction = {}
    centres_output = []
    postes_aggregation = {}

    total_etp = 0
    total_heures = 0
    centres_simules = 0
    
    # Defaults globaux
    g_prod = float(global_params.get("productivite", 100))
    g_h_jour = float(global_params.get("heures_par_jour", 8.0))
    g_idle = float(global_params.get("idle_minutes", 0.0))
    g_complexite = float(global_params.get("taux_complexite", 1.0))
    g_nature = float(global_params.get("nature_geo", 1.0))

    for cid in centre_ids:
        centre_meta = centres_map.get(cid)
        if not centre_meta: continue
        
        payload = centres_payload[cid]
        vol_list = payload["volumes"]
        c_params = payload["params"] # Type CentreParams ou None
        
        if not vol_list: continue

        # --- DETERMINATION DES PARAMETRES APPLIQUES ---
        # Priorité : Param Centre > Param Global > Defaut
        
        def use_val(local_val, global_val, default=0.0):
            if local_val is not None and float(local_val) > 0: return float(local_val)
            if global_val is not None: return float(global_val)
            return default

        # Params Moteur
        s_prod = use_val(c_params.productivite if c_params else None, g_prod, 100.0)
        s_h_jour = use_val(c_params.capacite_nette if c_params else None, g_h_jour, 8.0)
        s_idle = use_val(c_params.temps_mort if c_params else None, g_idle, 0.0)
        s_complexite = use_val(c_params.coeff_circ if c_params else None, g_complexite, 1.0)
        s_geo = use_val(c_params.coeff_geo if c_params else None, g_nature, 1.0)
        
        # Params Spécifiques Volumes (Ratios)
        # On checke c_params ou on met des defaults raisonnables
        p_colis_sac = c_params.colis_amana_par_sac if c_params and c_params.colis_amana_par_sac else 10.0
        p_co_sac = c_params.courriers_co_par_sac if c_params and c_params.courriers_co_par_sac else 4500.0
        p_cr_sac = c_params.courriers_cr_par_sac if c_params and c_params.courriers_cr_par_sac else 500.0
        p_cr_cai = c_params.cr_par_caisson if c_params and c_params.cr_par_caisson else 500.0
        p_pct_col = c_params.pct_collecte if c_params and c_params.pct_collecte is not None else 5.0
        p_pct_ret = c_params.pct_retour if c_params and c_params.pct_retour is not None else 5.0
        p_ed = c_params.ed_percent if c_params and c_params.ed_percent is not None else 0.0
        
        # Percent Axes : Auto-calc ou Override
        # Calcul auto basé sur volumes
        sum_arr = sum(v.volume for v in vol_list if v.flux_id==1 and v.sens_id==1 and v.segment_id!=1)
        sum_arr_ax = sum(v.volume for v in vol_list if v.flux_id==1 and v.sens_id==1 and v.segment_id==5)
        calc_ax_arr = (sum_arr_ax / sum_arr) if sum_arr > 0 else 0.20
        
        sum_dep = sum(v.volume for v in vol_list if v.flux_id==1 and v.sens_id==3 and v.segment_id!=1)
        sum_dep_ax = sum(v.volume for v in vol_list if v.flux_id==1 and v.sens_id==3 and v.segment_id==5)
        calc_ax_dep = (sum_dep_ax / sum_dep) if sum_dep > 0 else 0.20
        
        # Override si param > 0 (sinon auto)
        s_ax_arr = c_params.pct_axes_arr / 100.0 if (c_params and c_params.pct_axes_arr and c_params.pct_axes_arr > 0) else calc_ax_arr
        s_ax_dep = c_params.pct_axes_dep / 100.0 if (c_params and c_params.pct_axes_dep and c_params.pct_axes_dep > 0) else calc_ax_dep
        
        # 🐛 DEBUG LOGS
        # print(f"🔹 [NATIONAL] Simulating Centre {cid} ({centre_meta.get('label')})")
        # print(f"   -> Prod={s_prod}%, H/J={s_h_jour}, Idle={s_idle}min")
        # print(f"   -> Axes Arr={s_ax_arr:.1%}, Axes Dep={s_ax_dep:.1%}")
        # print(f"   -> ED={p_ed}%")


        # --- Conversion Volumes UI ---
        volumes_items = []
        guichet_data = GuichetVolumesInput()
        
        for v in vol_list:
            flux_code = FLUX_ID_MAP.get(v.flux_id, "UNKNOWN")
            sens_code = SENS_ID_MAP.get(v.sens_id, "UNKNOWN")
            seg_code = SEGMENT_ID_MAP.get(v.segment_id, "GLOBAL")
            
            if v.sens_id == 2: # GUICHET
                if v.segment_id == 6: guichet_data.depot = (guichet_data.depot or 0) + v.volume
                elif v.segment_id == 7: guichet_data.recup = (guichet_data.recup or 0) + v.volume
                else: volumes_items.append(VolumeItem(flux=flux_code, sens=sens_code, segment=seg_code, volume=v.volume))
            else:
                volumes_items.append(VolumeItem(flux=flux_code, sens=sens_code, segment=seg_code, volume=v.volume))

        volumes_ui = VolumesUIInput(
            volumes_flux=volumes_items,
            guichet=guichet_data,
            nb_jours_ouvres_an=264,
            taux_complexite=s_complexite,
            nature_geo=s_geo,
            pct_axes_arrivee=s_ax_arr,
            pct_axes_depart=s_ax_dep,
            pct_collecte=p_pct_col,
            pct_retour=p_pct_ret,
            ed_percent=p_ed,
            # Ratios
            colis_amana_par_sac=p_colis_sac,
            courriers_co_par_sac=p_co_sac,
            courriers_cr_par_sac=p_cr_sac,
            cr_par_caisson=p_cr_cai
        )

        try:
            sim_res = calculer_simulation_centre_data_driven(
                db=db,
                centre_id=cid,
                volumes_ui=volumes_ui,
                productivite=s_prod,
                heures_par_jour=s_h_jour,
                idle_minutes=s_idle,
                ed_percent=p_ed
            )
            
            etp_mod = float(sim_res.fte_calcule or 0)
            heures_mod = float(sim_res.total_heures or 0)
            # print(f"   => RESULTAT: ETP MOD Calculé = {etp_mod:.2f} (Heures={heures_mod:.2f})")
            
            # --- CALCUL ACTUEL (Breakdown) ---
            # --- CALCUL ACTUEL (Database Direct) ---
            # Récupérer les effectifs actuels directement depuis la base pour certitude (évite les filtres simulation)
            sql_actuels = text("""
                SELECT p.type_poste, SUM(cp.effectif_actuel) as total
                FROM dbo.centre_postes cp
                JOIN dbo.postes p ON p.id = cp.poste_id
                WHERE cp.centre_id = :cid
                GROUP BY p.type_poste
            """)
            actuels_rows = db.execute(sql_actuels, {"cid": cid}).fetchall()
            act_stats = {row[0].strip().upper(): float(row[1] or 0) for row in actuels_rows if row[0]}
            
            act_moi = act_stats.get('MOI', 0.0)
            act_mod = act_stats.get('MOD', 0.0)
            act_aps = act_stats.get('APS', 0.0) + act_stats.get('STRUCT', 0.0) # APS often treated as Struct
            # --- CORRECTION (Step 350) : SOMME PURE ET SIMPLE ---
            # On additionne ce qui est typé dans les postes (MOI + MOD + APS)
            # ET on ajoute l'APS déclaré au niveau du centre (APS Externe)
            # On ignore le "Bulk" global qui peut contenir des lignes orphelines/non typées qui faussent le calcul.

            aps_ext = float(centre_meta.get('aps_ext') or 0)
            
            # Ajout de l'APS externe au compteur APS global
            act_aps += aps_ext
            
            # Total = Somme des catégories
            etp_actuel_centre = act_moi + act_mod + act_aps

            print(f"📋 [DEBUG CENTRE] CID={cid}: Total Calculé={etp_actuel_centre} (MOI={act_moi}, MOD={act_mod}, APS_Int+Ext={act_aps})")
            
            # --- CALCUL CIBLE (Selon règles Intervenant) ---
            # Cible = Arrondi(MOD Calculé) + MOI Actuel (Structurel)
            etp_mod_arrondi = round(etp_mod)
            etp_cible_arrondi = etp_mod_arrondi + act_moi
            
            # --- CALCUL ECART (Actuel - Cible) ---
            # Négatif = Manque de ressource (Déficit)
            # Positif = Surplus
            ecart_centre = etp_actuel_centre - etp_cible_arrondi
            
            # Agreg Direction
            did = centre_meta.get("direction_id")
            dlabel = centre_meta.get("direction_label") or "Sans Direction"
            if did not in results_by_direction:
                results_by_direction[did] = { 
                    "direction_id": did, "direction_label": dlabel, 
                    "direction_id": did, "direction_label": dlabel, 
                    "etp_total": 0.0, "heures_totales": 0.0, "centres_count": 0,
                    "act_moi": 0.0, "act_mod": 0.0, "act_aps": 0.0, "act_total": 0.0,
                    # Frontend Aliases Init
                    "moi": 0.0, "mod": 0.0, "aps": 0.0, "etpActuel": 0.0, "etpRecommande": 0.0, "tauxOccupation": 0.0
                }
            
            # On somme les CIBLES ARRONDIES pour le total national (plus réaliste que la somme des float)
            results_by_direction[did]["etp_total"] += etp_cible_arrondi
            results_by_direction[did]["heures_totales"] += heures_mod
            results_by_direction[did]["centres_count"] += 1
            results_by_direction[did]["act_moi"] += act_moi
            results_by_direction[did]["act_mod"] += act_mod
            results_by_direction[did]["act_aps"] += act_aps
            results_by_direction[did]["act_total"] += etp_actuel_centre
            
            print(f"📊 [AGREG DIR] DID={did} ({dlabel}): +MOI={act_moi}, +MOD={act_mod}, +APS={act_aps} → Totaux: MOI={results_by_direction[did]['act_moi']}, MOD={results_by_direction[did]['act_mod']}, APS={results_by_direction[did]['act_aps']}")
            
            # 🆕 Calcul des volumes agrégés pour affichage dans le modal
            vol_sacs_total = 0
            vol_colis_total = 0
            vol_courrier_total = 0
            vol_ebarkia_total = 0
            
            for v in vol_list:
                # Sacs = Amana + CO + CR en arrivée, segment GLOBAL
                if v.flux_id in [1, 2, 3] and v.sens_id == 1 and v.segment_id == 1:  # AMANA/CO/CR, ARRIVEE, GLOBAL
                    vol_sacs_total += v.volume
                # Colis = segments PART + PRO
                if v.segment_id in [2, 3]:  # PART, PRO
                    vol_colis_total += v.volume
                # Courrier = LRH
                if v.flux_id == 5:  # LRH
                    vol_courrier_total += v.volume
                # E-Barkia
                if v.flux_id == 4:  # EBARKIA
                    vol_ebarkia_total += v.volume
            
            # 🆕 Aliases for Frontend Compatibility
            # 🆕 Aliases updated in finalizer loop to ensure consistency
             

            
            
            # Output Detail
            centres_output.append({
                "centre_id": cid,
                "nom": centre_meta.get("label"),
                "direction_id": did,
                "direction_label": dlabel,
                "typologie": centre_meta.get("categorie_label"),
                "etp_actuel": etp_actuel_centre,
                "act_moi": act_moi,
                "act_mod": act_mod,
                "act_aps": act_aps,
                "etp_calcule": etp_cible_arrondi, # Affiche la cible arrondie
                "ecart": ecart_centre,
                # 🆕 Paramètres de simulation utilisés (pour affichage dans le modal)
                "parametres": {
                    "productivite": s_prod,
                    "heures_par_jour": s_h_jour,
                    "temps_mort": s_idle,
                    "taux_complexite": s_complexite,
                    "nature_geo": s_geo,
                    "pct_axes_arrivee": s_ax_arr,
                    "pct_axes_depart": s_ax_dep,
                    "pct_collecte": p_pct_col,
                    "pct_retour": p_pct_ret,
                    "ed_percent": p_ed,
                    "colis_sac": p_colis_sac,
                    "co_sac": p_co_sac,
                    "cr_sac": p_cr_sac,
                    "cr_caisson": p_cr_cai
                },
                # 🆕 Volumes utilisés (calculés directement depuis vol_list)
                "volumes": {
                    "sacs": vol_sacs_total,
                    "colis": vol_colis_total,
                    "courrier": vol_courrier_total,
                    "ebarkia": vol_ebarkia_total
                }
            })
            
            
            # Agreg Postes (Conserve le lien avec le centre pour le modal)
            for p in sim_res.postes:
                lbl = (p.poste_label or "Inconnu").strip()
                
                # Agrégation globale (pour l'onglet "Consolidé Postes")
                if lbl not in postes_aggregation:
                    postes_aggregation[lbl] = { "poste_label": lbl, "type_poste": p.type_poste, "etp_actuel": 0.0, "etp_calcule": 0.0 }
                postes_aggregation[lbl]["etp_actuel"] += (p.effectif_actuel or 0)
                
                val_calcule = p.etp_calcule
                if p.type_poste == 'MOI' and val_calcule == 0: val_calcule = p.effectif_actuel
                postes_aggregation[lbl]["etp_calcule"] += val_calcule
                
                # 🆕 Ajout des postes détaillés par centre (pour le modal)
                val_arrondi = round(val_calcule)
                centres_output[-1].setdefault("postes", []).append({
                    "label": lbl,  # 🔧 Correction: "label" au lieu de "poste_label"
                    "poste_label": lbl,  # Gardé pour compatibilité
                    "type_poste": p.type_poste,
                    "effectif_actuel": p.effectif_actuel or 0,  # 🔧 Correction: "effectif_actuel" au lieu de "etp_actuel"
                    "etp_actuel": p.effectif_actuel or 0,  # Gardé pour compatibilité
                    "etp_calcule": val_calcule,
                    "etp_arrondi": val_arrondi,  # 🆕 Effectif arrondi
                    "ecart": (p.effectif_actuel or 0) - val_arrondi,  # 🔧 Écart = Actuel - Arrondi
                    "centre_id": cid,
                    "centre_nom": centre_meta.get("label")
                })
                
            total_etp += etp_cible_arrondi
            total_heures += heures_mod
            centres_simules += 1

        except Exception as e:
            print(f"⚠️ Erreur sim centre {cid}: {e}")
            import traceback; traceback.print_exc()

    # --- 4. Finalisation & Réponse ---
    # Finalize Aliases
    for d in results_by_direction.values():
        d["moi"] = d["act_moi"]
        d["mod"] = d["act_mod"]
        d["aps"] = d["act_aps"]
        d["etpActuel"] = d["act_total"]
        d["etpRecommande"] = d["etp_total"]
        act = d["act_total"]
        rec = d["etp_total"]
        d["tauxOccupation"] = round((rec / act * 100), 1) if act > 0 else 0
        
    directions_list = list(results_by_direction.values())
    if len(directions_list) > 0:
        print(f"🐛 DEBUG FINAL DIRECTION[0]: {directions_list[0]}")
        print(f"🔍 KEYS: {list(directions_list[0].keys())}")
    postes_list = list(postes_aggregation.values())
    
    centres_output.sort(key=lambda x: x['nom'])
    postes_list.sort(key=lambda x: x['poste_label'])
    
    return {
        "centres_simules": centres_simules,
        "centres_simules": centres_simules,
        "directions": directions_list,
        "regionsData": directions_list, # 🆕 Alias for Frontend
        "centres": centres_output,
        "centres": centres_output,
        "postes": postes_list,
        "kpis_nationaux": {
            "etp_total": round(total_etp, 2),
            "heures_totales": round(total_heures, 2),
            "centres_total": centres_simules,
            "directions_total": len(directions_list)
        }
    }

def _empty_response():
    return {
        "centres_simules": 0, "directions": [], "centres": [], "postes": [],
        "kpis_nationaux": { "etp_total": 0.0, "heures_totales": 0.0, "centres_total": 0, "directions_total": 0 }
    }
