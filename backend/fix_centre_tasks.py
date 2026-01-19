import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def fix_centre_tasks():
    with engine.begin() as conn:
        print("Fixing Tasks for Centre TEST...")
        
        flux_id = 1
        sens_id = 1
        seg_id = 2
        
        # Lookup CP
        cp_row = conn.execute(text("SELECT id, nom FROM dbo.centre_poste WHERE nom LIKE '%TEST%'")).mappings().first()
        if not cp_row:
             print("Centre TEST not found!")
             return
             
        cp_id = cp_row['id']
        print(f"Found Centre: {cp_row['nom']} (ID={cp_id})")
        
        # Check if tasks exist for this center
        count = conn.execute(text("SELECT count(*) FROM dbo.taches WHERE centre_poste_id = :cp"), {"cp": cp_id}).scalar()
        print(f"Tasks for CP {cp_id}: {count}")
        
        if count > 0:
            # Update ALL tasks for this center to be Amana/Arrivee/Part just for brute force testing
            # Or just update first 20
            sql = text("""
                UPDATE dbo.taches
                SET flux_id = :f, sens_id = :s, segment_id = :sg
                WHERE id IN (
                    SELECT TOP 20 id FROM dbo.taches WHERE centre_poste_id = :cp
                )
            """)
            conn.execute(sql, {"f": flux_id, "s": sens_id, "sg": seg_id, "cp": cp_id})
            print(f"Updated 20 tasks for CP {cp_id} to F={flux_id}, S={sens_id}, SG={seg_id}")
        else:
            print("No tasks found for this centre!")

if __name__ == "__main__":
    fix_centre_tasks()
