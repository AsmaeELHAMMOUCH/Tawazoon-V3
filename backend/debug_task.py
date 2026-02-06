import sys
import os

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste
from sqlalchemy import func

def debug_task_search():
    db = SessionLocal()
    try:
        print("Searching for tasks with name like 'Chant et Pointage'...")
        
        # Search by name purely
        tasks = db.query(Tache).filter(func.lower(Tache.nom_tache).like("%chant et pointage%")).all()
        
        print(f"Found {len(tasks)} tasks matching name 'Chant et Pointage'.")
        
        for t in tasks:
            print("-" * 50)
            print(f"ID: {t.id}")
            print(f"Nom: '{t.nom_tache}'")
            print(f"Famille: '{t.famille_uo}'")
            print(f"Unité: '{t.unite_mesure}'")
            print(f"Produit: '{t.produit}'")
            # Also check spaces/hidden chars
            print(f"DEBUG Famille: {repr(t.famille_uo)}")
            print(f"DEBUG Produit: {repr(t.produit)}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_task_search()
