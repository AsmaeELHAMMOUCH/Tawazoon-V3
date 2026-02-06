
import sys
import os
from sqlalchemy import func
from sqlalchemy.orm import Session

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db, engine
from app.models.db_models import Poste, CentrePoste

def verify_bandoeng_query():
    print("Connecting to REAL database...")
    db = Session(bind=engine)
    try:
        centre_id = 1942 # Bandoeng
        print(f"Testing list_bandoeng_postes query for centre_id={centre_id}...")
        
        query = (
            db.query(
                Poste.id,
                CentrePoste.id.label("centre_poste_id"),
                Poste.label,
                Poste.type_poste,
                func.coalesce(CentrePoste.effectif_actuel, 0).label("effectif_actuel"),
                Poste.Code
            )
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code)
            .filter(CentrePoste.centre_id == centre_id)
            .order_by(Poste.label)
        )
        
        rows = query.all()
        print(f"Query returned {len(rows)} rows.")
        
        if len(rows) > 0:
            print(f"First row: {rows[0]}")
            # Access attributes to ensure they are loaded
            print(f"Label: {rows[0].label}")
            print(f"Type: {rows[0].type_poste}")
            print(f"Code: {rows[0].Code}")
        else:
            print("No rows found. (This might be valid if Bandoeng has no data properly linked yet)")

    except Exception as e:
        print(f"Error executing query: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_bandoeng_query()
