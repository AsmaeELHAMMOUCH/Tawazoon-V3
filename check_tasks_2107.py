
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def check_tasks_2107():
    db = SessionLocal()
    try:
        centre_id = 2107
        # Find all CentrePoste for this centre
        cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
        cp_ids = [cp.id for cp in cps]
        
        if not cp_ids:
            print(f"No postes linked to centre {centre_id}")
            return

        # Find all tasks for these CentrePostes
        tasks = db.query(Tache).filter(Tache.centre_poste_id.in_(cp_ids)).all()
        print(f"Total tasks for centre {centre_id}: {len(tasks)}")
        
        # Group by poste
        poste_tasks = {}
        for t in tasks:
            cp = db.query(CentrePoste).filter(CentrePoste.id == t.centre_poste_id).first()
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            p_label = p.label if p else "Unknown"
            if p_label not in poste_tasks:
                poste_tasks[p_label] = 0
            poste_tasks[p_label] += 1
            
        print("Tasks per poste:")
        for label, count in poste_tasks.items():
            print(f" - {label}: {count} tasks")

        # Let's also check for tasks that ARE in the DB but maybe etat='NA'
        all_tasks_count = db.query(Tache).filter(Tache.centre_poste_id.in_(cp_ids)).count()
        active_tasks_count = db.query(Tache).filter(Tache.centre_poste_id.in_(cp_ids), Tache.etat != 'NA').count()
        print(f"Total tasks: {all_tasks_count}, Active tasks: {active_tasks_count}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_tasks_2107()
