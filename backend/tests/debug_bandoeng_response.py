import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.services.bandoeng_engine import (
    run_bandoeng_simulation,
    BandoengInputVolumes,
    BandoengParameters
)

db = SessionLocal()

# Test avec un poste spécifique
centre_id = 1942
poste_id = None  # Tous les postes

volumes = BandoengInputVolumes(
    amana_import=1000,
    amana_export=1000,
    courrier_ordinaire_import=5000,
    courrier_ordinaire_export=5000,
    courrier_recommande_import=2000,
    courrier_recommande_export=2000,
    grid_values={
        'amana': {
            'depot': {'gc': {'local': '500', 'axes': '500'}, 'part': {'local': '0', 'axes': '0'}},
            'recu': {'gc': {'local': '500', 'axes': '500'}, 'part': {'local': '0', 'axes': '0'}}
        },
        'cr': {
            'med': {'local': '1000', 'axes': '1000'},
            'arrive': {'local': '1000', 'axes': '1000'}
        },
        'co': {
            'med': {'local': '2500', 'axes': '2500'},
            'arrive': {'local': '2500', 'axes': '2500'}
        },
        'ebarkia': {
            'med': {'local': '0', 'axes': '0'},
            'arrive': {'local': '0', 'axes': '0'}
        }
    }
)

params = BandoengParameters()

result = run_bandoeng_simulation(db, centre_id, volumes, params, poste_id)

print(f"Total tasks: {len(result.tasks)}")
print(f"Total heures: {result.total_heures:.2f}")

# Group by task name
from collections import defaultdict
by_name = defaultdict(list)
for task in result.tasks:
    if task.heures_calculees > 0:
        by_name[task.task_name].append(task)

print(f"\nTasks with multiple responsables:")
for name, tasks in by_name.items():
    if len(tasks) > 1:
        print(f"\n{name}:")
        for t in tasks:
            print(f"  - {t.responsable} (CP_ID: {t.centre_poste_id}, heures: {t.heures_calculees:.3f})")

db.close()
