import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def check_tasks():
    with engine.connect() as conn:
        print("Checking tasks for Amana/Arrivee/Part...")
        
        # Get Flux ID for AMANA just to be sure
        flux_id = conn.execute(text("SELECT id FROM dbo.flux WHERE code LIKE '%AMANA%'")).scalar()
        print(f"Flux Amana ID: {flux_id}")
        
        # Sens=1, Seg=2
        sens_id = 1
        seg_id = 2
        
        # Count tasks
        sql = text("""
            SELECT count(*) 
            FROM dbo.taches 
            WHERE flux_id = :f AND sens_id = :s AND segment_id = :sg
        """)
        count = conn.execute(sql, {"f": flux_id, "s": sens_id, "sg": seg_id}).scalar()
        print(f"Tasks matching Amana/Arrivee/Part: {count}")
        
        # Also check for NULLs
        nulls = conn.execute(text("SELECT count(*) FROM dbo.taches WHERE flux_id IS NULL OR sens_id IS NULL OR segment_id IS NULL")).scalar()
        print(f"Tasks with NULL keys: {nulls}")

if __name__ == "__main__":
    check_tasks()
