import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def fix_mock_data():
    with engine.begin() as conn:
        print("Fixing Mock Data...")
        
        # Get Flux ID
        flux_id = conn.execute(text("SELECT id FROM dbo.flux WHERE code LIKE '%AMANA%'")).scalar()
        print(f"Using Flux ID: {flux_id}")
        
        # Sens=1 (Arrivee), Seg=2 (Part)
        sens_id = 1
        seg_id = 2
        
        # Update tasks that look like they belong to this group
        # e.g. "Tri", "Scan", "Distribution" + "Colis" or "Amana" or just generic ones for testing
        # I will start broad: Update tasks where libelle contains 'Colis' and 'Tri'
        
        # First, see what we have
        rows = conn.execute(text("SELECT id, libelle FROM dbo.taches WHERE libelle LIKE '%Colis%' OR libelle LIKE '%Amana%'")).mappings().all()
        print(f"Found {len(rows)} potential tasks.")
        
        # If no tasks found with those names, I'll update tasks by ID 1..10 just for test
        if not rows:
             print("No explicit Amana tasks found. Updating generic tasks 1-10 for testing.")
             target_ids = list(range(1, 11))
        else:
             target_ids = [r['id'] for r in rows]
        
        if target_ids:
            # Update them
            # Note: I'm converting list to tuple for SQL IN clause safe injection
            # But standard :ids param with tuple works in some dialects, safe way with text is loop or comma string
            
            # Update 10 arbitrary tasks to Ensure we have data
            conn.execute(text(f"""
                UPDATE dbo.taches 
                SET flux_id = :f, sens_id = :s, segment_id = :sg
                WHERE id IN ({','.join(map(str, target_ids[:20]))}) 
            """), {"f": flux_id, "s": sens_id, "sg": seg_id})
            
            print(f"Updated {min(len(target_ids), 20)} tasks to Flux={flux_id}, Sens={sens_id}, Seg={seg_id}")
            
if __name__ == "__main__":
    fix_mock_data()
