
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste
from sqlalchemy import text

def inspect_cci_tasks():
    db = SessionLocal()
    try:
        print("Inspecting Tasks for CASA CCI (1952)...")
        
        # Query generic tasks for this center
        sql = """
            SELECT 
                t.id, 
                t.nom_tache, 
                t.famille_uo, 
                t.produit, 
                t.unite_mesure
            FROM taches t
            JOIN centre_postes cp ON t.centre_poste_id = cp.id
            WHERE cp.centre_id = 1952
            ORDER BY t.famille_uo, t.produit
        """
        
        rows = db.execute(text(sql)).mappings().all()
        
        print(f"Found {len(rows)} tasks.")
        for r in rows:
            f_clean = f"'{r['famille_uo']}'" if r['famille_uo'] else "None"
            p_clean = f"'{r['produit']}'" if r['produit'] else "None"
            print(f"ID: {r['id']} | Task: {r['nom_tache'][:40]}... | Famille: {f_clean} | Produit: {p_clean} | Unite: {r['unite_mesure']}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_cci_tasks()
