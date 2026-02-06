
import sys
import os
sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache

def inspect_task():
    db = SessionLocal()
    try:
        tasks = db.query(Tache).filter(Tache.nom_tache.like("%recouvrement%")).all()
        print(f"Found {len(tasks)} tasks matching '%recouvrement%'.")
        for t in tasks:
            print(f"ID: {t.id}")
            print(f"Name: '{t.nom_tache}'")
            print(f"Famille UO: '{t.famille_uo}'")
            print(f"Produit: '{t.produit}'")
            print("-" * 20)
    finally:
        db.close()

if __name__ == "__main__":
    inspect_task()
