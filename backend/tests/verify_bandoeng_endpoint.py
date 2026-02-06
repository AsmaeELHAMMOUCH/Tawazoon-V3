
import sys
import os
from unittest.mock import MagicMock

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# MOCK db_models to prevent duplication error
sys.modules['app.models.db_models'] = MagicMock()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.db import get_db, Base
from app.models.ref import Poste, CentrePoste, Region, Centre
# Need to import router to test it, but it imports services/engine potentially...
# We will just verify the query logic by reproducing it on the in-memory DB
# reproducing what's inside list_bandoeng_postes

def verify_endpoint_logic():
    # Use in-memory SQLite for testing
    engine = create_engine(
        "sqlite:///:memory:", 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )

    # Schema stripping for SQLite
    for table in Base.metadata.tables.values():
        table.schema = None

    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("Creating test data...")
        # Create a Poste with a Code
        poste = Poste(label="Responsable Bandoeng", Code="RESP_BAN_001", type_poste="MOD")
        db.add(poste)
        db.flush()

        # Create Hierarchy
        region = Region(label="Casa")
        db.add(region)
        db.flush()
        
        centre = Centre(label="Bandoeng Centre", region_id=region.id, id=1942) # ID matched
        db.add(centre)
        db.flush()
        
        # Create CentrePoste Linked by Code
        cp = CentrePoste(
            centre_id=1942, 
            poste_id=poste.id, 
            code_resp="RESP_BAN_001",
            effectif_actuel=5
        )
        db.add(cp)
        db.commit()

        print("Verifying Query Logic (Join by Code)...")
        from sqlalchemy import func
        # Reproduce query from bandoeng_router.py
        query = (
            db.query(
                Poste.id,
                CentrePoste.id.label("centre_poste_id"),
                Poste.label,
                Poste.type_poste,
                func.coalesce(CentrePoste.effectif_actuel, 0).label("effectif_actuel"),
                Poste.Code
            )
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code) # <--- The critical join
            .filter(CentrePoste.centre_id == 1942)
            .order_by(Poste.label)
        )
         
        rows = query.all()
        
        if len(rows) == 1:
            r = rows[0]
            print(f"SUCCESS: Found poste via Code Join: {r.label}, Code={r.Code}, Effectif={r.effectif_actuel}")
            if r.Code == "RESP_BAN_001" and r.effectif_actuel == 5:
                 print("Data match verified.")
            else:
                 print("FAILED: Data mismatch.")
        else:
            print(f"FAILED: Expected 1 row, got {len(rows)}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_endpoint_logic()
