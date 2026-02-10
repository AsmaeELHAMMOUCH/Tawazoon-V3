import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste

db = SessionLocal()
centre_id = 1942

print(f"Checking tasks for Centre {centre_id}...")

tasks = (
    db.query(Tache)
    .join(CentrePoste)
    .filter(CentrePoste.centre_id == centre_id)
    .all()
)

print(f"Total Tasks found: {len(tasks)}")

if tasks:
    print("\nSample Tasks (First 20):")
    print(f"{'ID':<6} | {'Nom Tache':<40} | {'Produit':<30} | {'Unite':<15} | {'Moy Sec':<10}")
    print("-" * 110)
    for t in tasks[:20]:
        print(f"{t.id:<6} | {str(t.nom_tache)[:38]:<40} | {str(t.produit)[:28]:<30} | {str(t.unite_mesure)[:13]:<15} | {t.moy_sec:<10}")
else:
    print("No tasks found!")
    # Check if CentrePostes exist
    cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
    print(f"\nCentrePostes found: {len(cps)}")

db.close()
