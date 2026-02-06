
import sys
import os
from sqlalchemy.orm import Session

# Setup app context
sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste
from app.services.simulation_data_driven import calculer_simulation_data_driven, VolumeContext
from app.schemas.volumes_ui import VolumesUIInput

def debug_target():
    db = SessionLocal()
    try:
        # 1. Trouver la tâche CR MED
        task_id = 12677
        task = db.query(Tache).filter(Tache.id == task_id).first()
        
        if not task:
            print(f"❌ Tâche {task_id} introuvable!")
            return

        print(f"✅ Tâche trouvée: ID={task.id} '{task.nom_tache}'")
        print(f"   Produit: '{task.produit}' | Unité: '{task.unite_mesure}' | Base: {task.base_calcul}")
        print(f"   CP ID: {task.centre_poste_id}")

        # 2. Préparer un input volume (Mock)
        # On met des volumes génériques pour que ça ne crash pas
        class MockVolumes:
            def __init__(self):
                self.volumes_flux = [] 
                self.flux_arrivee = {}
                self.flux_depart = {}
                self.colis_amana_par_sac = 10.0
                self.courriers_co_par_sac = 4500.0
                self.cr_par_caisson = 500.0
                self.pct_axes_arrivee = 0.3
                self.pct_axes_depart = 0.3
                self.nb_jours_ouvres_an = 264.0
                # Attributs dynamiques pour accès .attr
                self.ed_percent = 0.0
                self.colis_par_collecte = 1.0
                self.pct_collecte = 5.0
                self.taux_complexite = 1.0
                self.nature_geo = 1.0
                
            def dict(self):
                return self.__dict__

        # 3. Lancer la simulation pour ce CentrePoste
        # Cela va déclencher nos logs (BLOC CR DEPART etc.)
        print("\n--- DÉBUT SIMULATION ---")
        volumes_input = MockVolumes()
        
        # On appelle le service (qui contient maintenant nos Prints/Logs)
        calculer_simulation_data_driven(
            db=db,
            centre_poste_id=task.centre_poste_id,
            volumes_ui=volumes_input,
            debug=True
        )
        print("--- FIN SIMULATION ---")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_target()
