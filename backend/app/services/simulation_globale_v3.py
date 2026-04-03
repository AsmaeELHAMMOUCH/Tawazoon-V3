from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import math

# --- Configuration Métier ---
ROLES_A_IGNORER = {"client", "agence", "compta", "automatisation"}

# Postes fixes (établi à 1.0 par défaut, sauf règles spécifiques)
ROLES_FIXES = {
    "chef service",
    "chargé archives",
    "chargé réclamation et reporting",
    "chargé contrôle",
    "détaché agence",
    "chargé stock", # "doit être traité comme poste fixe dans le calcul 'calculé'"
}

def math_round(val: float, decimals: int = 0) -> float:
    """Arrondi mathématique standard (0.5 -> 1), comme Math.round en JS."""
    multiplier = 10 ** decimals
    return math.floor(val * multiplier + 0.5) / multiplier


def normalize_name(name: str) -> str:
    if not name: return ""
    return name.strip().lower()

def get_simulation_globale_v3(db: Session, sacs: int, dossiers_mois: int, productivite: float) -> Dict[str, Any]:
    # 1. Calculs de base
    dossiers_jour = dossiers_mois / 22.0
    heures_net = (8.0 * productivite) / 100.0
    
    if heures_net <= 0:
        heures_net = 0.0001 # Éviter division par zéro

    # 2. Chargement des données de référence
    # On récupère tous les métiers pour avoir une liste exhaustive
    sql_metiers = text("SELECT id_metier, nom_metier, effectif_actuel FROM metier")
    metiers_actuels = db.execute(sql_metiers).fetchall()
    
    # On récupère les métiers recommandés
    sql_metiers_rec = text("SELECT id_metier_recommandee, nom_metier_recomande FROM METIER_recommande")
    metiers_reco = db.execute(sql_metiers_rec).fetchall()
    
    # 3. Mapping des données (Clé = Nom normalisé)
    # On va construire un dictionnaire pour regrouper Actuel, Calculé (M) et Recommandé (R)
    # Note: On utilise le nom de METIER (actuel) comme pivot, 
    # mais on complète avec ceux de METIER_recommande qui n'existeraient pas.
    
    data_map = {} # nom_normalise -> { "label": str, "id_actuel": int, "id_reco": int, "actuel": float }
    
    for mid, nom, actuel in metiers_actuels:
        norm = normalize_name(nom)
        if norm in ROLES_A_IGNORER: continue
        data_map[norm] = {
            "label": nom,
            "id_actuel": mid,
            "id_reco": None,
            "actuel": float(actuel or 0)
        }
        
    for mid, nom in metiers_reco:
        norm = normalize_name(nom)
        if norm in ROLES_A_IGNORER: continue
        if norm not in data_map:
            data_map[norm] = {
                "label": nom,
                "id_actuel": None,
                "id_reco": mid,
                "actuel": 0.0
            }
        else:
            data_map[norm]["id_reco"] = mid

    # 4. Calculs détaillés par position
    results = []
    
    # On trie par nom pour plus de clarté
    sorted_norms = sorted(data_map.keys())
    
    for norm in sorted_norms:
        info = data_map[norm]
        nom_label = info["label"]
        actuel_val = info["actuel"]
        
        # --- CALCULÉ (M) ---
        calcule_fte = 0.0
        if info["id_actuel"] is not None:
            if norm in ROLES_FIXES:
                calcule_fte = 1.0
            else:
                # Calcul à partir de Tache
                sql_taches = text("""
                    SELECT minutes_tache, secondes_tache, unite 
                    FROM tache 
                    WHERE id_metier = :mid
                """)
                taches = db.execute(sql_taches, {"mid": info["id_actuel"]}).fetchall()
                
                total_hours = 0.0
                for m, s, u in taches:
                    vol = sacs if (u or "").strip() == "Sac" else dossiers_jour
                    duree_h = ((m or 0) * 60 + (s or 0)) / 3600.0
                    total_hours += vol * duree_h
                
                calcule_fte = total_hours / heures_net if heures_net > 0 else 0.0
                
                # Règle: Si ratio <= 0.1 alors 0 (Alignement avec effectif_global)
                if math_round(calcule_fte, 2) <= 0.1:
                    calcule_fte = 0.0
        
        # --- RECOMMANDÉ (R) ---
        recommande_fte = 0.0
        if info["id_reco"] is not None:
            if norm in ROLES_FIXES:
                recommande_fte = 1.0
            else:
                # Calcul à partir de Tache_rec (Correction BUG: utiliser unite_rec)
                sql_taches_rec = text("""
                    SELECT minutes_tache_rec, secondes_tache_rec, unite_rec 
                    FROM tache_rec 
                    WHERE id_metier_rec = :mid
                """)
                taches_rec = db.execute(sql_taches_rec, {"mid": info["id_reco"]}).fetchall()
                
                total_minutes_rec = 0.0
                for m, s, u in taches_rec:
                    vol = sacs if (u or "").strip() == "Sac" else dossiers_jour
                    duree_min = (m or 0) + ((s or 0) / 60.0)
                    total_minutes_rec += vol * duree_min
                
                ratio = total_minutes_rec / (heures_net * 60.0) if heures_net > 0 else 0.0
                
                # Règle: Si ratio <= 0.1 alors 0
                if math_round(ratio, 2) <= 0.1:
                    recommande_fte = 0.0
                else:
                    recommande_fte = ratio

        # Arrondis demandés
        calcule_arrondi = math_round(calcule_fte, 2)
        recommande_arrondi = math_round(recommande_fte, 2)
        
        # Écarts
        ecart_calc_act = math_round(calcule_arrondi - actuel_val, 2)
        ecart_reco_act = math_round(recommande_arrondi - actuel_val, 2)
        ecart_reco_calc = math_round(recommande_arrondi - calcule_arrondi, 2)
        
        results.append({
            "position": nom_label,
            "actuel": actuel_val,
            "calcule": calcule_arrondi,
            "recommande": recommande_arrondi,
            "ecart_calc_actuel": ecart_calc_act,
            "ecart_reco_actuel": ecart_reco_act,
            "ecart_reco_calcule": ecart_reco_calc
        })

    # 5. Totaux
    # Calcul des totaux basé sur les arrondis à l'entier (ce que l'utilisateur voit)
    # pour garantir la cohérence parfaite du "TOTAL GÉNÉRAL"
    total_actuel_int = sum(math_round(r["actuel"]) for r in results)
    total_calcule_int = sum(math_round(r["calcule"]) for r in results)
    total_recommande_int = sum(math_round(r["recommande"]) for r in results)
    
    totals = {
        "position": "TOTAL",
        "actuel": float(total_actuel_int),
        "calcule": float(total_calcule_int),
        "recommande": float(total_recommande_int),
        "ecart_calc_actuel": float(total_calcule_int - total_actuel_int),
        "ecart_reco_actuel": float(total_recommande_int - total_actuel_int),
        "ecart_reco_calcule": float(total_recommande_int - total_calcule_int)
    }

    # 6. Graphe (Barres)
    # Inclure le total dans le graphe comme demandé
    chart_data = [
        {"position": r["position"], "actuel": r["actuel"], "calcule": r["calcule"], "recommande": r["recommande"]}
        for r in results
    ]
    # On peut aussi ajouter une entrée spécifique pour le total ou simplement le gérer au front
    # Le user dit "inclure la ligne TOTAL dans le graphe"
    chart_data.append({
        "position": "TOTAL",
        "actuel": totals["actuel"],
        "calcule": totals["calcule"],
        "recommande": totals["recommande"],
        "is_total": True
    })

    return {
        "dossiers_jour": math_round(dossiers_jour, 2),
        "heures_net_jour": math_round(heures_net, 2),
        "rows": results,
        "total": totals,
        "chart_data": chart_data
    }
