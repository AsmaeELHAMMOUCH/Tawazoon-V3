
import sys
import os

# Add the backend directory to sys.path to import app modules
sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal
from app.models.db_models import Poste, CentrePoste, Tache, Centre

def check_agent_ops():
    db = SessionLocal()
    try:
        # 1. Find the centre
        centre_id = 2107
        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            # Maybe ID is string in some contexts, but model says Integer
            centre = db.query(Centre).filter(Centre.id == str(centre_id)).first()
            
        if not centre:
            print(f"Centre {centre_id} not found.")
            # List some centres to verify IDs
            some_centres = db.query(Centre).limit(5).all()
            print("Existing centres sample:")
            for c in some_centres:
                print(f" - {c.id}: {c.label}")
            return

        print(f"Centre: {centre.id} - {centre.label}")

        # 2. Find Agent Opérations poste
        # Search by label or name. db_models.Poste has 'label' and 'name' might have been 'Code'? 
        # Actually it has 'label', 'type_poste', 'Code'.
        print("Searching for 'Agent Opérations' in 'postes' table...")
        postes = db.query(Poste).filter(Poste.label.like('%Agent Opérations%')).all()
        
        if not postes:
            print("Poste 'Agent Opérations' not found by label. Checking all postes for centre 2107...")
            cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre.id).all()
            print(f"Postes for centre {centre.id} ({len(cps)}):")
            for cp in cps:
                p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
                if p:
                    print(f" - ID: {p.id}, Code/Name: {getattr(p, 'name', 'N/A')}, Label: {p.label}, Type: {p.type_poste}, Code: {p.Code}")
            return

        for p in postes:
            print(f"Found Poste: ID {p.id}, Label: {p.label}, Code: {p.Code}, Type: {p.type_poste}")
            
            # 3. Check if linked to centre 2107
            cp = db.query(CentrePoste).filter(CentrePoste.centre_id == centre.id, CentrePoste.poste_id == p.id).first()
            if not cp:
                print(f"Poste {p.id} ({p.label}) NOT linked to centre {centre.id}.")
                continue
            
            print(f"Poste {p.id} linked to centre {centre.id} (CentrePoste ID: {cp.id}, Effectif: {cp.effectif_actuel}, CodeResp: {cp.code_resp})")
            
            # 4. Count tasks
            tasks_count = db.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
            print(f"Number of tasks for this poste in centre {centre.id}: {tasks_count}")
            
            if tasks_count > 0:
                # Check for active vs non-active tasks
                active_tasks = db.query(Tache).filter(Tache.centre_poste_id == cp.id, Tache.etat != 'NA').count()
                print(f"Number of ACTIVE tasks: {active_tasks}")
                
                tasks = db.query(Tache).filter(Tache.centre_poste_id == cp.id).limit(10).all()
                for t in tasks:
                    print(f"  - [{t.etat or 'A'}] Task: {t.nom_tache}, Chrono: {t.moyenne_min}min {t.moy_sec}s")
            else:
                print("Checking if tasks exist for this poste in OTHER centres...")
                other_cp = db.query(CentrePoste).filter(CentrePoste.poste_id == p.id).first()
                if other_cp:
                    other_tasks_count = db.query(Tache).filter(Tache.centre_poste_id == other_cp.id).count()
                    print(f"Found {other_tasks_count} tasks for this same poste in centre {other_cp.centre_id}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_agent_ops()
