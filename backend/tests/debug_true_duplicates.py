import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste

db = SessionLocal()

centre_id = 1942

# Get all tasks and check for true duplicates
tasks = (
    db.query(Tache, CentrePoste, Poste)
    .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
    .join(Poste, CentrePoste.poste_id == Poste.id)
    .filter(CentrePoste.centre_id == centre_id)
    .filter(Poste.type_poste == 'MOD')
    .all()
)

print(f"Found {len(tasks)} MOD tasks.\n")

# Group by composite key
from collections import defaultdict
groups = defaultdict(list)

for tache, cp, poste in tasks:
    # Create composite key
    key = (
        tache.nom_tache or "",
        tache.produit or "",
        tache.famille_uo or "",
        tache.unite_mesure or "",
        tache.phase or ""
    )
    groups[key].append((tache, cp, poste))

# Find true duplicates (same key, different centre_poste_id)
print("True duplicates (same name, produit, famille, unite, phase but different centre_poste_id):\n")
duplicate_count = 0

for key, entries in groups.items():
    if len(entries) > 1:
        # Check if they have different centre_poste_ids
        cp_ids = set(cp.id for _, cp, _ in entries)
        if len(cp_ids) > 1:
            duplicate_count += 1
            task_name, produit, famille, unite, phase = key
            print(f"Task: {task_name}")
            print(f"  Produit: {produit}")
            print(f"  Famille: {famille}")
            print(f"  Unite: {unite}")
            print(f"  Phase: {phase}")
            print(f"  Entries: {len(entries)}")
            
            # Get unique responsables
            responsables = set(poste.label for _, _, poste in entries)
            print(f"  Responsables: {', '.join(responsables)}")
            print()

print(f"\nTotal true duplicates found: {duplicate_count}")

db.close()
