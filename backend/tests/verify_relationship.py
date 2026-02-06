
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
from app.core.db import Base
from app.models.ref import Poste, CentrePoste, Region, Centre, Categorie

def verify_relationship():
    # Use in-memory SQLite for testing
    engine = create_engine(
        "sqlite:///:memory:", 
        connect_args={"check_same_thread": False}, 
        poolclass=StaticPool
    )

    # SQLite doesn't support schemas generally (unless attached).
    # We must strip schema from Table objects in metadata before create_all.
    for table in Base.metadata.tables.values():
        table.schema = None

    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("Creating test data...")
        # Create a Poste with a specific Code
        poste = Poste(label="Responsable Logistique", Code="RESP_LOG_001")
        db.add(poste)
        db.flush() # ID generation

        # Create dummy parents
        region = Region(label="Test Region")
        db.add(region)
        db.flush()
        
        centre = Centre(label="Test Centre", region_id=region.id)
        db.add(centre)
        db.flush()
        
        # Create CentrePoste
        cp = CentrePoste(
            centre_id=centre.id, 
            poste_id=poste.id, 
            code_resp="RESP_LOG_001"
        )
        db.add(cp)
        db.commit()

        print("Verifying relationship...")
        # Query the CentrePoste back
        # We need to refresh or query fresh to ensure lazy load triggers or eager load works.
        db.expire_all()
        
        cp_fetched = db.query(CentrePoste).first()
        
        # Access relationship
        if cp_fetched.poste_ref:
            print(f"SUCCESS: Link works! Found poste: {cp_fetched.poste_ref.Code} - {cp_fetched.poste_ref.label}")
            if cp_fetched.poste_ref.Code == "RESP_LOG_001":
                 print("Code match verified.")
            else:
                 print("FAILED: Code mismatch.")
        else:
            print("FAILED: poste_ref is None.")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_relationship()
