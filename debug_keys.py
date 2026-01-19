
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.db import DATABASE_URL

def debug_data():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("--- REFERENCE DATA ---")
        flux = db.execute(text("SELECT id, code, libelle FROM dbo.flux")).mappings().all()
        print(f"FLUX: {[dict(r) for r in flux]}")

        sens = db.execute(text("SELECT id, code, libelle FROM dbo.volume_sens")).mappings().all()
        print(f"SENS: {[dict(r) for r in sens]}")

        seg = db.execute(text("SELECT id, code, libelle FROM dbo.volume_segments")).mappings().all()
        print(f"SEGMENTS: {[dict(r) for r in seg]}")

        print("\n--- TACHES DATA SAMPLE (first 50 with non-null flux) ---")
        # Check tasks that have keys set
        sql_tasks = """
            SELECT TOP 50 id, nom_tache, centre_poste_id, flux_id, sens_id, segment_id 
            FROM dbo.taches 
            WHERE flux_id IS NOT NULL 
        """
        tasks = db.execute(text(sql_tasks)).mappings().all()
        for t in tasks:
            print(dict(t))

        print("\n--- NULL KEYS CHECK ---")
        # Count tasks with null keys
        null_counts = db.execute(text("SELECT COUNT(*) as count FROM dbo.taches WHERE flux_id IS NULL OR sens_id IS NULL OR segment_id IS NULL")).scalar()
        total_counts = db.execute(text("SELECT COUNT(*) as count FROM dbo.taches")).scalar()
        print(f"Tasks with at least one NULL key: {null_counts} / {total_counts}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_data()
