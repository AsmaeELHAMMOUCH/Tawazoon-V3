
import sys
import os
from sqlalchemy import func, text
from sqlalchemy.orm import Session

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db, engine
from app.models.db_models import Poste, CentrePoste, Tache

def debug_bandoeng_codes():
    print("Connecting to REAL database to debug Bandoeng Codes (Centre ID 1942)...")
    db = Session(bind=engine)
    try:
        centre_id = 1942
        
        print("\n--- 1. Linkable Codes in CentrePoste with Types ---")
        codes = (
            db.query(CentrePoste.code_resp, Poste.type_poste, func.count(CentrePoste.id))
            .join(Poste, CentrePoste.code_resp == Poste.Code) # Join to get type
            .filter(CentrePoste.centre_id == centre_id)
            .group_by(CentrePoste.code_resp, Poste.type_poste)
            .all()
        )
        
        print(f"Found {len(codes)} distinct codes in CentrePoste:")
        for code, p_type, count in codes:
            print(f" - '{code}' (Type: {p_type}): {count} CentrePoste record(s)")
            
        # 2. Check Tasks per Code
        print("\n--- 2. Tasks count per Code (via CentrePoste) ---")
        # Join CentrePoste -> Tache, group by CentrePoste.code_resp
        task_counts = (
            db.query(CentrePoste.code_resp, func.count(Tache.id))
            .join(Tache, Tache.centre_poste_id == CentrePoste.id)
            .filter(CentrePoste.centre_id == centre_id)
            .group_by(CentrePoste.code_resp)
            .all()
        )
        
        print(f"Found tasks for {len(task_counts)} codes:")
        for code, t_count in task_counts:
            print(f" - '{code}': {t_count} tasks")

        # 3. Check for Codes with NO Tasks
        cp_codes = set(c[0] for c in codes)
        task_codes = set(c[0] for c in task_counts)
        missing_tasks = cp_codes - task_codes
        
        if missing_tasks:
            print(f"\n[WARNING] The following Codes exist in CentrePoste but have NO TASKS linked:")
            for m in missing_tasks:
                print(f" - '{m}'")
        else:
            print("\n[OK] All CentrePoste codes have at least one task.")

        # 4. Check for whitespace issues
        print("\n--- 3. Whitespace Check ---")
        whitespace_issues = [c[0] for c in codes if c[0] and (c[0] != c[0].strip())]
        if whitespace_issues:
             print(f"[WARNING] These codes have surrounding whitespace (might cause mismatch): {whitespace_issues}")
        else:
             print("[OK] No whitespace issues detected in DB codes.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_bandoeng_codes()
