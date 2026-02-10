
import os
import sys

# Ajouter backend au sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.services.bandoeng_engine import run_bandoeng_simulation, BandoengInputVolumes, BandoengParameters

def test_2064():
    db = SessionLocal()
    try:
        # Volumes fictifs pour le test
        grid = {
            "amana": {
                "depot": { "gc": { "local": 1000, "axes": 500 }, "part": { "local": 100, "axes": 50 } },
                "recu": { "gc": { "local": 1000, "axes": 500 }, "part": { "local": 100, "axes": 50 } }
            },
            "co": { "med": { "local": 500, "axes": 250 }, "arrive": { "local": 1000, "axes": 500 } },
            "cr": { "med": { "local": 500, "axes": 250 }, "arrive": { "local": 1000, "axes": 500 } }
        }
        # On va aussi tester avec les noms exacts si possible, mais le moteur devrait mapper arrive -> ARRIVE
        
        volumes = BandoengInputVolumes(grid_values=grid)
        params = BandoengParameters(productivite=100.0, idle_minutes=0.0, shift=1)
        
        centre_id = 2064
        print(f"--- TEST CENTRE {centre_id} ---")
        
        # 1. Test Vue Centre (global)
        res_global = run_bandoeng_simulation(db, centre_id, volumes, params)
        print(f"Simulation Centre (Global) : {res_global.total_heures:.2f} heures, {len(res_global.tasks)} taches.")
        
        # 2. Test Vue Intervenant (un intervenant au hasard qui a des taches)
        if len(res_global.tasks) > 0:
            first_task = res_global.tasks[0]
            # On cherche le code_resp via la base pour être sûr d'en tester un existant
            from app.models.db_models import CentrePoste
            cp = db.query(CentrePoste).filter(CentrePoste.id == first_task.centre_poste_id).first()
            if cp and cp.code_resp:
                print(f"Test filtrage pour Intervenant (code={cp.code_resp})...")
                res_inter = run_bandoeng_simulation(db, centre_id, volumes, params, poste_code=cp.code_resp)
                print(f"Simulation Intervenant : {res_inter.total_heures:.2f} heures, {len(res_inter.tasks)} taches.")

    except Exception as e:
        print(f"Erreur: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    test_2064()
