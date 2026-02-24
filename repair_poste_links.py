
import sys
import os

sys.path.append(os.path.abspath("backend"))

from app.core.db import SessionLocal, engine
from app.models.db_models import Poste, CentrePoste, Tache

engine.echo = False

def repair_and_merge():
    db = SessionLocal()
    try:
        print("Starting advanced repair (Repair & Merge) of poste links...")
        
        all_cps = db.query(CentrePoste).all()
        
        repaired_count = 0
        merged_count = 0
        skipped_count = 0
        
        for cp in all_cps:
            # Check if current poste_id is valid
            p = db.query(Poste).filter(Poste.id == cp.poste_id).first()
            if p:
                skipped_count += 1
                continue
            
            # Broken link!
            if not cp.code_resp:
                continue
                
            p_correct = db.query(Poste).filter(Poste.Code == cp.code_resp).first()
            if not p_correct:
                continue
            
            # Check if there is already a CentrePoste for this (centre_id, correct_poste_id)
            existing_cp = db.query(CentrePoste).filter(
                CentrePoste.centre_id == cp.centre_id, 
                CentrePoste.poste_id == p_correct.id
            ).first()
            
            if existing_cp:
                # MERGE: Move tasks from cp to existing_cp
                print(f"Merging CP_ID {cp.id} -> existing CP_ID {existing_cp.id} (Centre {cp.centre_id}, Poste {p_correct.label})")
                tasks = db.query(Tache).filter(Tache.centre_poste_id == cp.id).all()
                for t in tasks:
                    t.centre_poste_id = existing_cp.id
                
                # Copy effectif if existing is 0 and broken has something? 
                # Or just keep existing. Let's be safe.
                if (existing_cp.effectif_actuel or 0) == 0 and (cp.effectif_actuel or 0) > 0:
                    existing_cp.effectif_actuel = cp.effectif_actuel
                
                # Delete the broken cp
                db.delete(cp)
                merged_count += 1
            else:
                # REPAIR: Just update the poste_id
                print(f"Repairing CP_ID {cp.id}: Invalid PosteID {cp.poste_id} -> {p_correct.id} ({p_correct.label})")
                cp.poste_id = p_correct.id
                repaired_count += 1
        
        print(f"Committing changes ({repaired_count} repairs, {merged_count} merges)...")
        db.commit()
        print("Repair & Merge complete.")
        print(f"Summary: Skipped {skipped_count}, Repaired {repaired_count}, Merged {merged_count}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    repair_and_merge()
