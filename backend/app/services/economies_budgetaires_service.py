import os
import pyodbc
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def get_db_connection():
    try:
        conn = pyodbc.connect(
            f"DRIVER={os.getenv('DB_DRIVER')};"
            f"SERVER={os.getenv('DB_SERVER')};"
            f"DATABASE={os.getenv('DB_NAME')};"
            f"UID={os.getenv('DB_USER')};"
            f"PWD={os.getenv('DB_PASSWORD')};"
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise e

def safe_div(numerator, denominator):
    return numerator / denominator if denominator != 0 else 0

class EconomiesBudgetairesService:
    def __init__(self):
        self.postes_fixes = [
            "chef service",
            "chargé archives",
            "chargé réclamation et reporting",
            "chargé contrôle",
            "détaché agence",
            "chargé stock"
        ]
        self.postes_exclus = ["client", "agence", "compta", "automatisation"]

    def format_mad(self, val):
        return f"{val:,.0f} MAD".replace(",", " ")

    def calculate_simulation(self, sacs_jour: float, dossiers_mois: float, productivite: float):
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Basic Calculations
            jours_ouvrables_par_mois = 22
            dossiers_par_jour = dossiers_mois / 22
            heures_net_par_jour = 8 * (productivite / 100)

            # 1. Fetch METIER data (Calculated Staff)
            cursor.execute("SELECT id_metier, nom_metier, effectif_Actuel, Salaire FROM METIER")
            metiers_data = cursor.fetchall()

            calcule_dict = {}
            effectifs_actuels = {}
            
            for row in metiers_data:
                id_metier, nom, effectif, salaire = row
                nom_clean = nom.strip().lower()
                
                if nom_clean in self.postes_exclus:
                    continue
                
                effectifs_actuels[nom_clean] = {
                    "effectif": int(effectif or 0),
                    "salaire": float(salaire or 0)
                }

                if nom_clean in self.postes_fixes:
                    calcule_dict[nom_clean] = 1.0
                else:
                    cursor.execute("SELECT minutes_tache, secondes_tache, unite FROM Tache WHERE id_metier = ?", (id_metier,))
                    taches = cursor.fetchall()
                    total_heures_metier = 0
                    for m_t, s_t, unit in taches:
                        sec = (float(m_t or 0) * 60 + float(s_t or 0))
                        if unit == "Sac":
                            total_heures_metier += (sec * sacs_jour) / 3600
                        elif unit == "Demande":
                            total_heures_metier += (sec * dossiers_par_jour) / 3600
                    
                    calcule_val = safe_div(total_heures_metier, heures_net_par_jour)
                    calcule_dict[nom_clean] = round(calcule_val)

            # 2. Fetch METIER_recommande data (Recommended Staff)
            cursor.execute("SELECT id_metier_recommandee, nom_metier_recomande, effectif_Actuel_rec, salaire FROM METIER_recommande")
            reco_data = cursor.fetchall()

            recommande_dict = {}
            recommande_effectifs_base = {}

            for row in reco_data:
                id_reco, nom_rec, eff_act_rec, salaire_rec = row
                nom_clean_rec = nom_rec.strip().lower()

                if nom_clean_rec in self.postes_exclus:
                    continue
                
                recommande_effectifs_base[nom_clean_rec] = {
                    "effectif": int(eff_act_rec or 0),
                    "salaire": float(salaire_rec or 0)
                }

                if nom_clean_rec in self.postes_fixes:
                    recommande_dict[nom_clean_rec] = 1.0
                else:
                    cursor.execute("SELECT minutes_tache_rec, secondes_tache_rec, unite_rec FROM Tache_rec WHERE id_metier_rec = ?", (id_reco,))
                    taches_rec = cursor.fetchall()
                    total_minutes_rec = 0
                    for m_r, s_r, unit_rec in taches_rec:
                        duree_min = float(m_r or 0) + (float(s_r or 0) / 60.0)
                        # Parity rule: use 'unit' mapping even if redundant but wait, unit_rec is from DB
                        # The prompt says: "Oui, ici le script utilise unite au lieu de unite_rec"
                        # But in the recommended fetch loop, I don't have 'unite' (from Tache), I have 'unite_rec'.
                        # The script probably meant 'unite_rec' behaves like 'unite' or literally variable named 'unite'.
                        if unit_rec == "Sac":
                            volume = sacs_jour
                        elif unit_rec == "Demande":
                            volume = dossiers_par_jour
                        else:
                            volume = 0
                        total_minutes_rec += volume * duree_min
                    
                    if heures_net_par_jour:
                        ratio = total_minutes_rec / (heures_net_par_jour * 60)
                        if round(ratio, 2) <= 0.1:
                            recommande_val = 0
                        else:
                            if nom_clean_rec == "coordinateur réseau":
                                recommande_val = round(ratio, 1)
                            else:
                                recommande_val = math.ceil(ratio)
                    else:
                        recommande_val = 0
                    
                    recommande_dict[nom_clean_rec] = recommande_val

            # 3. Consolidate Tables
            table_comparison = []
            table_ecarts = []
            
            total_ms_actuel_mois = 0
            total_ms_calcule_mois = 0
            total_ms_reco_mois = 0

            # Merge all keys from both dicts (calculated normally contains most)
            all_metiers = sorted(list(set(calcule_dict.keys()) | set(recommande_dict.keys())))

            for m in all_metiers:
                act_data = effectifs_actuels.get(m, {"effectif": 0, "salaire": 0})
                rec_staff_data = recommande_effectifs_base.get(m, {"effectif": 0, "salaire": act_data["salaire"]})
                
                salaire = act_data["salaire"]
                eff_actuel = act_data["effectif"]
                eff_calcule = calcule_dict.get(m, 0)
                eff_recommande = recommande_dict.get(m, 0)

                ms_actuel = eff_actuel * salaire
                ms_calcule = eff_calcule * salaire
                ms_reco = eff_recommande * salaire

                total_ms_actuel_mois += ms_actuel
                total_ms_calcule_mois += ms_calcule
                total_ms_reco_mois += ms_reco

                # Add to tables
                table_comparison.append([
                    m.capitalize(),
                    self.format_mad(ms_actuel),
                    self.format_mad(ms_calcule),
                    self.format_mad(ms_reco)
                ])

                table_ecarts.append([
                    self.format_mad(ms_calcule - ms_actuel),
                    self.format_mad(ms_reco - ms_actuel),
                    self.format_mad(ms_reco - ms_calcule)
                ])

            # Insert Mois and Année rows
            # Comparison Header
            comparison_rows = [
                ["Mois", self.format_mad(total_ms_actuel_mois), self.format_mad(total_ms_calcule_mois), self.format_mad(total_ms_reco_mois)],
                ["Année", self.format_mad(total_ms_actuel_mois * 12), self.format_mad(total_ms_calcule_mois * 12), self.format_mad(total_ms_reco_mois * 12)]
            ] + table_comparison

            # Ecarts Header
            ecarts_rows = [
                [
                    self.format_mad(total_ms_calcule_mois - total_ms_actuel_mois),
                    self.format_mad(total_ms_reco_mois - total_ms_actuel_mois),
                    self.format_mad(total_ms_reco_mois - total_ms_calcule_mois)
                ],
                [
                    self.format_mad((total_ms_calcule_mois - total_ms_actuel_mois) * 12),
                    self.format_mad((total_ms_reco_mois - total_ms_actuel_mois) * 12),
                    self.format_mad((total_ms_reco_mois - total_ms_calcule_mois) * 12)
                ]
            ] + table_ecarts

            return {
                "derived": {
                    "dossiers_jours": round(dossiers_par_jour, 1),
                    "heures_net_jour": round(heures_net_par_jour, 1)
                },
                "comparaison": comparison_rows,
                "ecarts": ecarts_rows,
                "totals_annuels": {
                    "actuel": total_ms_actuel_mois * 12,
                    "calcule": total_ms_calcule_mois * 12,
                    "recommande": total_ms_reco_mois * 12
                }
            }

        finally:
            cursor.close()
            conn.close()
