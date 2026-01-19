
import sys
import os
import logging
from sqlalchemy.orm import Session

# Setup app context
sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.services.simulation_data_driven import calculer_simulation_data_driven
from app.schemas.models import VolumesUIInput, VolumeItem

# Silence noise
logging.basicConfig(level=logging.ERROR)

def run_debug_simulation():
    db = SessionLocal()
    try:
        # ID from user logs
        cp_id = 8366
        
        # Construct input from user log payload
        # 'volumes_flux' items need to be converted to VolumeItem objects if the schema expects that, 
        # OR the service expects the Pydantic model directly.
        # The service signature is: calculer_simulation_data_driven(..., volumes_ui: VolumesUIInput, ...)
        # VolumesUIInput actually has 'volumes_flux' as a list of VolumeItem? 
        # Let's check VolumesUIInput definition in schemas/models.py... 
        # Wait, VolumesUIInput in Step 97 had 'sacs', 'colis', etc. 
        # BUT VolumeContext uses `volumes_ui.volumes_flux` inside logic.
        # The Step 97 view showed `VolumesInput` (UI top inputs) separate from `VolumeItem`.
        # However, `VolumeContext` (seen in Step 40) iterates `self.raw_volumes.volumes_flux`.
        # This implies `VolumesUIInput` (or whatever creates raw_volumes) has this field.
        # Ideally I should pass the construct that `VolumeContext` expects.
        
        # Let's look at `app/services/simulation_data_driven.py` definition of VolumesUIInput again? 
        # Or just blindly pass the dict structure if Pydantic parses it.
        
        # MOCKING:
        # I'll create a dummy class to mimic the object if Pydantic is tricky to instantiate standalone without all fields.
        class MockVolumes:
            def __init__(self):
                self.volumes_flux = [
                    type('V',(),{'flux':'AMANA','sens':'ARRIVEE','segment':'PROFESSIONNEL','volume':92520.0}),
                    type('V',(),{'flux':'AMANA','sens':'ARRIVEE','segment':'PARTICULIER','volume':17397.0}),
                    type('V',(),{'flux':'CR','sens':'ARRIVEE','segment':'GLOBAL','volume':22335.0}),
                    # Minimal set for testing
                ]
                self.colis_amana_par_sac = 10.0
                self.pct_axes_arrivee = 0.3
                self.nb_jours_ouvres_an = 264.0
                self.taux_complexite = 1.0
                self.nature_geo = 1.0
                self.cr_par_caisson = 500.0

        print(f"--- Running Simulation for CP {cp_id} ---")
        
        # Call the function directly
        result = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=cp_id,
            volumes_ui=MockVolumes(), # Duck typing should work if it just accesses attributes
            productivite=100.0,
            heures_par_jour=8.0,
            debug=True
        )
        
        print(f"Total Heures: {result.total_heures}")
        print("--- Tasks Found in Result ---")
        for t in result.details_taches:
            if "Comptage" in t.task or "Rapprochement" in t.task or "Tri entre" in t.task:
                print(f"TASK: '{t.task}' | Vol={t.nombre_unite} | Hrs={t.heures} | Formula={t.formule}")
                
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_debug_simulation()
