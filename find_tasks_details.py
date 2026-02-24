
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def find_missing_tasks_details():
    db = SessionLocal()
    try:
        centre_id = 2107
        cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
        cp_ids = [cp.id for cp in cps]
        
        # All tasks for this centre
        tasks = db.query(Tache).filter(Tache.centre_poste_id.in_(cp_ids)).all()
        
        counts = {}
        for t in tasks:
            counts[t.centre_poste_id] = counts.get(t.centre_poste_id, 0) + 1
            
        print(f"Postes with tasks for centre {centre_id}:")
        for cp_id, count in counts.items():
            cp = db.query(CentrePoste).filter(CentrePoste.id == cp_id).first()
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            p_label = p.label if p else f"UNKNOWN (PosteID: {cp.poste_id})"
            print(f" - CP_ID: {cp_id}, Tasks: {count}, Poste: {p_label}")
            
            # If it's a "Gestionnaire Opérations", maybe it's what they mean
            if "OPÉRATIONS" in p_label.upper():
                print(f"   >>> POTENTIAL MATCH: {p_label}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_missing_tasks_details()
