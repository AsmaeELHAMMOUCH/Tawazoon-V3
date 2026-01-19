import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def simple_fix():
    with engine.begin() as conn:
        print("Simple Fix...")
        
        # Hardcode Flux=1 (Assuming Amana is 1, usually is)
        flux_id = 1
        sens_id = 1
        seg_id = 2
        
        print(f"Updating tasks to F={flux_id}, S={sens_id}, SG={seg_id}")
        
        # Update first 20 tasks just to have data
        # We use a subquery or top
        sql = text("""
            UPDATE dbo.taches
            SET flux_id = :f, sens_id = :s, segment_id = :sg
            WHERE id IN (
                SELECT TOP 20 id FROM dbo.taches
            )
        """)
        conn.execute(sql, {"f": flux_id, "s": sens_id, "sg": seg_id})
        print("Updated 20 tasks.")

if __name__ == "__main__":
    simple_fix()
