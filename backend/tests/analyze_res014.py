from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste

def inspect_res014_logic():
    db = SessionLocal()
    try:
        print("--- Analyzing RES014 Task Logic ---")
        cp = db.query(CentrePoste).filter(CentrePoste.code_resp == 'RES014').first()
        if not cp:
            print("CentrePoste RES014 not found")
            return

        tasks = db.query(Tache).filter(Tache.centre_poste_id == cp.id).all()
        print(f"Found {len(tasks)} tasks.")
        
        for t in tasks:
            print(f"\nTask: {t.nom_tache} (ID: {t.id})")
            print(f"  - Produit: '{t.produit}'")
            print(f"  - Unité: '{t.unite_mesure}'")
            print(f"  - Phase: '{t.phase}'")
            print(f"  - Base Calcul: {t.base_calcul}")
            print(f"  - Moy Min: {t.moyenne_min}, Moy Sec: {t.moy_sec}")
            # print(f"  - Formula Hint: Check engine logic for '{t.produit}' and unit '{t.unite_mesure}'")

    finally:
        db.close()

if __name__ == "__main__":
    inspect_res014_logic()
