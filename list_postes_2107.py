
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

# Disable echo for cleaner output
engine.echo = False

def list_all_postes_2107():
    db = SessionLocal()
    try:
        centre_id = 2107
        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            print(f"Centre {centre_id} not found.")
            return

        print(f"Centre: {centre.id} - {centre.label}")

        cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre.id).all()
        print(f"Postes linked to centre {centre.id} ({len(cps)}):")
        for cp in cps:
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            if p:
                tasks_count = db.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
                print(f" - ID: {p.id}, CodeResp: {cp.code_resp}, Label: {p.label}, Type: {p.type_poste}, Tasks: {tasks_count}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_all_postes_2107()
