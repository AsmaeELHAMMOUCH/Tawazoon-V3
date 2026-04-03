import os
import pyodbc
import logging
import pandas as pd
from io import BytesIO
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

class ComparatifPositionsService:
    def __init__(self):
        self.exclusions = ["client", "agence", "compta", "automatisation"]
        self.overrides_calcule = {
            "chargé stock": 1,
            "chargé réclamation et reporting": 1,
            "chargé contrôle": 1,
            "chargé codes pin": 1,
            "détaché agence": 1
        }
        self.overrides_recommande = {
            "chef service": 1,
            "chargé archives": 1,
            "chargé réclamation et reporting": 1,
            "chargé contrôle": 1,
            "détaché agence": 1
        }

    def run_simulation(self):
        sacs = 50
        dossiers_mois = 6500
        prod = 100
        
        heures_net = (8 * prod) / 100
        dossiers_jour = dossiers_mois / 22

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # 1. Fetch METIER data (Actuel)
            cursor.execute("SELECT id_metier, nom_metier FROM METIER")
            metiers = cursor.fetchall()
            
            calcule_dict = {}
            id_dict = {}

            for m_id, m_nom in metiers:
                nom_clean = m_nom.strip().lower()
                id_dict[nom_clean] = m_id
                
                if nom_clean in self.exclusions:
                    continue
                
                cursor.execute("SELECT minutes_tache, secondes_tache, unite FROM Tache WHERE id_metier = ?", (m_id,))
                taches = cursor.fetchall()
                total_hours = sum(
                    ((m or 0) * 60 + (s or 0)) * (sacs if u == "Sac" else dossiers_jour) / 3600
                    for m, s, u in taches
                )
                calcule_dict[nom_clean] = round(total_hours / heures_net) if heures_net else 0

            # Apply Calculation Overrides
            for name, val in self.overrides_calcule.items():
                if name in calcule_dict or any(nom == name for id, nom in id_dict.items()): # Check if it exists in DB at least
                    calcule_dict[name] = val

            # 2. Fetch METIER_recommande data (Recommended)
            cursor.execute("SELECT id_metier_recommandee, nom_metier_recomande FROM METIER_recommande")
            recos = cursor.fetchall()
            
            recommande_dict = {}
            for r_id, r_nom in recos:
                nom_clean = r_nom.strip().lower()
                if nom_clean not in id_dict:
                    id_dict[nom_clean] = r_id
                
                if nom_clean in self.exclusions:
                    continue
                
                cursor.execute("SELECT minutes_tache_rec, secondes_tache_rec, unite_rec FROM Tache_rec WHERE id_metier_rec = ?", (r_id,))
                taches_rec = cursor.fetchall()
                total_hours_rec = sum(
                    ((m or 0) * 60 + (s or 0)) * (sacs if u == "Sac" else dossiers_jour) / 3600
                    for m, s, u in taches_rec
                )
                recommande_dict[nom_clean] = round(total_hours_rec / heures_net) if heures_net else 0

            # Apply Recommendation Overrides
            for name, val in self.overrides_recommande.items():
                recommande_dict[name] = val

            # 3. Union and Comment Logic
            all_metiers = list(set(calcule_dict.keys()) | set(recommande_dict.keys()))
            
            rows = []
            for nom in all_metiers:
                actuel_val = calcule_dict.get(nom, 0)
                reco_val = recommande_dict.get(nom, 0)
                
                nom_actuel = nom.title() if nom in calcule_dict else ""
                nom_recommande = nom.title() if nom in recommande_dict else ""
                
                # Logic exact du commentaire
                if actuel_val != 0 and reco_val != 0:
                    commentaire = "RAS"
                elif (actuel_val == 0 and reco_val != 0) or (nom not in calcule_dict and reco_val > 0):
                    commentaire = "Ajout"
                elif (actuel_val != 0 and reco_val == 0) or (nom not in recommande_dict and actuel_val > 0):
                    commentaire = "Suppression"
                else:
                    commentaire = ""
                
                id_poste = id_dict.get(nom, 9999)
                rows.append({
                    "id": id_poste,
                    "data": [nom_actuel, nom_recommande, commentaire]
                })

            # 4. Sorting
            rows.sort(key=lambda x: x["id"])
            
            final_rows = [r["data"] for r in rows]
            
            return {
                "columns": ["Positions Actuelles", "Positions Recommandées", "Commentaire"],
                "rows": final_rows
            }

        finally:
            cursor.close()
            conn.close()

    def export_excel(self):
        sim_data = self.run_simulation()
        df = pd.DataFrame(sim_data["rows"], columns=sim_data["columns"])
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Comparatif Positions')
        
        return output.getvalue()
