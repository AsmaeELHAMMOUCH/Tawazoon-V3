import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste

db = SessionLocal()

centre_id = 1942

# Get a sample task with multiple entries
task_name = "chargement VAN axe"

tasks = (
    db.query(Tache, CentrePoste, Poste)
    .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
    .join(Poste, CentrePoste.poste_id == Poste.id)
    .filter(CentrePoste.centre_id == centre_id)
    .filter(Tache.nom_tache == task_name)
    .all()
)

print(f"Found {len(tasks)} entries for task '{task_name}':\n")

for tache, cp, poste in tasks:
    print(f"Task ID: {tache.id}")
    print(f"  - Task Name: {tache.nom_tache}")
    print(f"  - Produit: {tache.produit}")
    print(f"  - Famille: {tache.famille_uo}")
    print(f"  - CentrePoste ID: {cp.id}")
    print(f"  - Poste ID: {poste.id}")
    print(f"  - Poste Label: {poste.label}")
    print(f"  - Poste Type: {poste.type_poste}")
    print()

db.close()
