import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste

db = SessionLocal()

centre_id = 1942
tasks = (
    db.query(
        Tache.nom_tache, 
        Tache.moy_sec, 
        Tache.produit, 
        Poste.label, 
        Poste.type_poste, 
        Tache.id, 
        CentrePoste.id
    )
    .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
    .join(Poste, CentrePoste.poste_id == Poste.id)
    .filter(CentrePoste.centre_id == centre_id)
    .all()
)

print(f"Found {len(tasks)} tasks.")

# Find duplicates by name
from collections import defaultdict
by_name = defaultdict(list)
for t in tasks:
    by_name[t[0]].append(t)

for name, entries in by_name.items():
    if len(entries) > 1:
        print(f"\nTask: {name}")
        for e in entries:
            # TaskName, VolRef?, Label, Type, TaskID, CP_ID
            print(f"  - Poste: {e[2]} (Type: {e[3]}), CP_ID: {e[5]}, TaskID: {e[4]}")
