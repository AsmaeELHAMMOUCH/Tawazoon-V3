
import sys
import os

# Ajouter le chemin du backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.services.simulation_data_driven import calculer_simulation_data_driven
from app.schemas.volumes_ui import VolumesUIInput

def debug_sim():
    db = SessionLocal()
    try:
        centre_poste_id = 8284
        volumes_ui = VolumesUIInput(
            flux_arrivee={
                "amana": {"GLOBAL": 1000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "co": {"GLOBAL": 5000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "cr": {"GLOBAL": 200, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "ebarkia": {"GLOBAL": 100, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "lrh": {"GLOBAL": 50, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
            },
            guichet={"DEPOT": 0, "RECUP": 0},
            flux_depart={
                "amana": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "co": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "cr": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
                "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
            },
            nb_jours_ouvres_an=264
        )
        
        print(f"Testing simulation for centre_poste_id={centre_poste_id}...")
        res = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=centre_poste_id,
            volumes_ui=volumes_ui,
            productivite=100.0,
            heures_par_jour=8.0,
            idle_minutes=0.0,
            debug=True
        )
        print("Success!")
        print(f"Total Hours: {res.total_heures}")
        print(f"ETP: {res.fte_calcule}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_sim()
