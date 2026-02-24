
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def search_for_agent_ops_anywhere():
    db = SessionLocal()
    try:
        # 1. Search by label fragments
        queries = ["%AGENT%OPERATIONS%", "%AGENT%OPRATIONS%", "%OPERATIONS%AGENT%", "%OPRATIONS%AGENT%"]
        found_any = False
        for q in queries:
            postes = db.query(Poste).filter(Poste.label.like(q)).all()
            for p in postes:
                found_any = True
                print(f"Found Poste: ID {p.id}, Code: {p.Code}, Label: {p.label}")
        
        if not found_any:
            print("No poste found with 'Agent' and 'Operations' in label.")

        # 2. Check around ID 301
        p_301 = db.query(Poste).filter(Poste.id == 301).first()
        if p_301:
            print(f"Poste 301 actually EXISTS: {p_301.label}")
        else:
            print("Poste 301 is indeed MISSING from the 'postes' table.")
            # Check max ID
            from sqlalchemy import func
            max_id = db.query(func.max(Poste.id)).scalar()
            print(f"Max Poste ID in table: {max_id}")

        # 3. Check some tasks for CP_ID 9579 to see what kind of activity it is
        tasks = db.query(Tache).filter(Tache.centre_poste_id == 9579).limit(10).all()
        print("Sample tasks for CP_ID 9579 (Poste 301):")
        for t in tasks:
            print(f" - {t.nom_tache} (Famille: {t.famille_uo})")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    search_for_agent_ops_anywhere()
