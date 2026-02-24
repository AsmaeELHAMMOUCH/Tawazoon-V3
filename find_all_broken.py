
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache, Centre

engine.echo = False

def find_all_broken_links():
    db = SessionLocal()
    try:
        # 1. Find all CPs where poste_id is not in postes table
        from sqlalchemy import not_
        all_cps = db.query(CentrePoste).all()
        
        broken = []
        for cp in all_cps:
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            if not p:
                broken.append(cp)
        
        print(f"Total broken CentrePoste links (non-existent poste_id): {len(broken)}")
        
        for cp in broken:
            tasks_count = db.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
            print(f"Broken Link: CP_ID {cp.id}, CentreID {cp.centre_id}, PosteID {cp.poste_id}, CodeResp {cp.code_resp}, Tasks {tasks_count}")
            
            # Try to find the correct poste by CodeResp
            if cp.code_resp:
                p_correct = db.query(Poste).filter(Poste.Code == cp.code_resp).first()
                if p_correct:
                    print(f"  -> CORRECT POSTE: ID {p_correct.id}, Label: {p_correct.label}")
                else:
                    # Maybe it's in another field or with different casing
                    p_correct = db.query(Poste).filter(Poste.Code.like(f"%{cp.code_resp}%")).first()
                    if p_correct:
                        print(f"  -> POTENTIAL CORRECT POSTE: ID {p_correct.id}, Label: {p_correct.label}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    find_all_broken_links()
