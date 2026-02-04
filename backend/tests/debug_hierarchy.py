from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Poste, HierarchiePostes
from sqlalchemy import text

def check_hierarchy_data():
    db = SessionLocal()
    try:
        # 1. Get posts for Centre Bandoeng (ID 1942)
        centre_id = 1942
        results = (
            db.query(Poste.id, Poste.label, Poste.Code, Poste.hie_poste)
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code)
            .filter(CentrePoste.centre_id == centre_id)
            .all()
        )
        
        print(f"--- Postes for Centre {centre_id} ---")
        print(f"{'ID':<5} | {'Label':<30} | {'Code':<10} | {'Hie_Poste':<10}")
        print("-" * 65)
        
        codes_to_check = set()
        for r in results:
            hie = r.hie_poste if r.hie_poste else "NULL"
            print(f"{r.id:<5} | {r.label[:30]:<30} | {r.Code:<10} | {hie:<10}")
            if r.hie_poste:
                codes_to_check.add(r.hie_poste)

        # 2. Check existence of these codes in Hierarchie_postes
        print("\n--- Hierarchie_postes Check ---")
        if codes_to_check:
            hie_rows = db.query(HierarchiePostes).filter(HierarchiePostes.code.in_(codes_to_check)).all()
            found_codes = {h.code: h.label for h in hie_rows}
            
            for code in codes_to_check:
                status = f"FOUND: {found_codes[code]}" if code in found_codes else "MISSING"
                print(f"Code '{code}': {status}")
        else:
            print("No hie_poste codes found in posts.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_hierarchy_data()
