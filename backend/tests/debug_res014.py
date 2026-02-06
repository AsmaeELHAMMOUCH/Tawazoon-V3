from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste

def debug_res014_tasks():
    db = SessionLocal()
    try:
        print("--- Debugging RES014 ---")
        
        # 1. Find the CentrePoste or Poste with code RES014
        # Check matching CentrePoste by code_resp
        cp_matches = db.query(CentrePoste).filter(CentrePoste.code_resp == 'RES014').all()
        print(f"Found {len(cp_matches)} CentrePoste entries with code_resp='RES014'")
        for cp in cp_matches:
            print(f"  - ID: {cp.id}, CentreID: {cp.centre_id}, PosteID: {cp.poste_id}, Effectif: {cp.effectif_actuel}")
            
            # Check tasks for this CP
            tasks = db.query(Tache).filter(Tache.centre_poste_id == cp.id).all()
            print(f"    -> Found {len(tasks)} tasks linked to this CentrePoste.")
            for t in tasks[:5]:
                print(f"       - Task: {t.nom_tache} (ID: {t.id})")

        if not cp_matches:
            print("No CentrePoste found with code_resp='RES014'. Checking Poste table...")
            postes = db.query(Poste).filter(Poste.Code == 'RES014').all()
            print(f"Found {len(postes)} Poste entries with Code='RES014'")
            for p in postes:
                print(f"  - ID: {p.id}, Label: {p.label}, Type: {p.type_poste}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_res014_tasks()
