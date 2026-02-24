
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def check_link_92_2107():
    db = SessionLocal()
    try:
        # Check if cp exists for centre 2107 and poste 92
        cp = db.query(CentrePoste).filter(CentrePoste.centre_id == 2107, CentrePoste.poste_id == 92).first()
        if cp:
            print(f"CentrePoste for 2107 and Poste 92 EXISTS: CP_ID {cp.id}")
            tasks_count = db.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
            print(f"Tasks count for this link: {tasks_count}")
        else:
            print("NO CentrePoste link between centre 2107 and Poste 92 (AGENT OPERATIONS)")

        # Also check if there's a poste with Code RES007 (which is ID 92) in CentrePoste
        cps_res007 = db.query(CentrePoste).filter(CentrePoste.centre_id == 2107, CentrePoste.code_resp == 'RES007').all()
        for cp in cps_res007:
            print(f"Found CP for 2107 with CodeResp RES007: ID {cp.id}, PosteID {cp.poste_id}")
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            if p:
                print(f" -> Linked to Poste: {p.label} (ID {p.id})")
            else:
                print(f" -> Linked to MISSING Poste: ID {cp.poste_id}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_link_92_2107()
