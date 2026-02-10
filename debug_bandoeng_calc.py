import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.services.bandoeng_engine import run_bandoeng_simulation, BandoengInputVolumes, BandoengParameters

# Mock Data
grid_values = {
    "amana": {
        "recu": {
            "gc": {"local": 100, "axes": 100},
            "part": {"local": 100, "axes": 100}
        },
        "depot": {
             "gc": {"local": 100, "axes": 100},
             "part": {"local": 100, "axes": 100}
        }
    },
    "cr": {
        "arrive": {"local": 100, "axes": 100},
        "med": {"local": 100, "axes": 100}
    },
    "co": {
        "arrive": {"local": 1000, "axes": 1000},
        "med": {"local": 1000, "axes": 1000}
    },
    "ebarkia": {"med": 50, "arrive": 50},
    "lrh": {"med": 50, "arrive": 50}
}

volumes = BandoengInputVolumes(grid_values=grid_values)
params = BandoengParameters(
    pct_sac=60, 
    colis_amana_par_canva_sac=35,
    nbr_co_sac=350,
    nbr_cr_sac=400,
    shift=1,
    productivite=100
)

db = SessionLocal()
try:
    print("Running Bandoeng Simulation Debug...")
    result = run_bandoeng_simulation(db, 1942, volumes, params, poste_code=None)
    
    print("\n--- Simulation Result ---")
    print(f"Total Heures: {result.total_heures}")
    print(f"Total FTE: {result.total_ressources_humaines}")
    print(f"Tasks Calculated: {len(result.tasks)}")
    
    print("\n--- Non-Zero Tasks ---")
    count = 0
    for t in result.tasks:
        if t.heures_calculees > 0:
            print(f"- {t.task_name} ({t.produit}): {t.heures_calculees:.4f} hrs (Vol: {t.volume_journalier:.2f})")
            count += 1
            if count > 10: 
                print("...more...")
                break
finally:
    db.close()
