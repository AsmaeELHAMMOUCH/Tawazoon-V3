from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Poste

def fix_centre_poste_mapping():
    db = SessionLocal()
    try:
        # 1. Get the target Poste (The "Real" RES014)
        target_poste = db.query(Poste).filter(Poste.Code == 'RES014').first()
        if not target_poste:
            print("Target Poste RES014 not found!")
            return

        print(f"Target Poste found: ID {target_poste.id} (Label: {target_poste.label}, Type: {target_poste.type_poste})")

        # 2. Get the CentrePoste that holds the code 'RES014' (currently mapped to wrong ID)
        cp = db.query(CentrePoste).filter(
            CentrePoste.centre_id == 1942, 
            CentrePoste.code_resp == 'RES014'
        ).first()

        if cp:
            print(f"CentrePoste found: ID {cp.id}, Current PosteID: {cp.poste_id}")
            
            if cp.poste_id != target_poste.id:
                print(f"Updating CentrePoste {cp.id} to point to Poste {target_poste.id}...")
                cp.poste_id = target_poste.id
                db.commit()
                print("Update successful.")
            else:
                print("CentrePoste is already mapped correctly.")
        else:
            print("CentrePoste with code 'RES014' not found in centre 1942.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_centre_poste_mapping()
