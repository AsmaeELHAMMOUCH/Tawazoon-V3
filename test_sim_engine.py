import sys
import os
from sqlalchemy.orm import Session

# Add backend directory to path to reach app module
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.db import SessionLocal
from app.services.bandoeng_engine import (
    run_bandoeng_simulation, 
    BandoengInputVolumes, 
    BandoengParameters
)

def test_simulation():
    db = SessionLocal()
    try:
        centre_id = 1942 # Centre used in VueIntervenant
        
        # Structure EXACTE envoyée par le frontend
        grid_values = {
            "amana": {
                "depot": {
                    "gc": { "global": "1000", "local": "700", "axes": "300" },
                    "part": { "global": "500", "local": "350", "axes": "150" }
                },
                "recu": {
                    "gc": { "global": "2000", "local": "1200", "axes": "800" },
                    "part": { "global": "1000", "local": "600", "axes": "400" }
                }
            },
            "cr": {
                "med": { "global": "300", "local": "210", "axes": "90" },
                "arrive": { "global": "400", "local": "240", "axes": "160" }
            },
            "co": {
                "med": { "global": "5000", "local": "3500", "axes": "1500" },
                "arrive": { "global": "8000", "local": "4800", "axes": "3200" }
            },
            "ebarkia": { "med": "50", "arrive": "30" },
            "lrh": { "med": "10", "arrive": "5" }
        }
        
        volumes = BandoengInputVolumes(grid_values=grid_values)
        params = BandoengParameters() # Defaults
        
        print("\n" + "="*80)
        print(" RUNNING BANDOENG SIMULATION TEST ")
        print("="*80)
        
        result = run_bandoeng_simulation(db, centre_id, volumes, params, None)
        
        print("\n" + "="*80)
        print(" SIMULATION SUMMARY ")
        print("="*80)
        print(f" Total Tasks: {len(result.tasks)}")
        print(f" Total Heures: {result.total_heures:.2f}")
        print(f" FTE Calcule: {result.fte_calcule:.2f}")
        print(f" FTE Arrondi: {result.fte_arrondi}")
        
        if result.tasks:
            print("\nTop 5 Tasks by Hours:")
            sorted_tasks = sorted(result.tasks, key=lambda x: x.heures_calculees, reverse=True)
            for t in sorted_tasks[:5]:
                print(f" - {t.task_name} ({t.produit}): {t.heures_calculees:.4f} hrs (Vol: {t.volume_journalier})")
        
    finally:
        db.close()

if __name__ == "__main__":
    test_simulation()
