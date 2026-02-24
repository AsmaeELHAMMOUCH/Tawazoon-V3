
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def debug_unknown_postes():
    db = SessionLocal()
    try:
        centre_id = 2107
        cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
        
        print(f"CentrePoste for 2107 ({len(cps)}):")
        for cp in cps:
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            tasks_count = db.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
            
            p_label = p.label if p else "--- MISSING POSTE ---"
            p_id = p.id if p else "N/A"
            
            print(f" - CP_ID: {cp.id}, PosteID: {cp.poste_id}, Label: {p_label}, Tasks: {tasks_count}")
            
            if not p and tasks_count > 0:
                print(f"   !!! CP_ID {cp.id} has {tasks_count} tasks but Poste with ID {cp.poste_id} is missing from 'postes' table.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_unknown_postes()
