import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def force_mock_tasks():
    # Use the center ID we found or fallback to 2199 if we are sure
    CENTER_ID = 2199 
    
    # Target Keys for "Amana / Arrivée / Part"
    FLUX_ID = 1  # Amana
    SENS_ID = 1  # Arrivée
    SEG_ID = 2   # Particuliers
    
    with engine.begin() as conn:
        print(f"Force updating tasks for Centre {CENTER_ID}...")
        
        # 1. Fetch IDs to update
        sql_ids = text("SELECT TOP 5 id FROM dbo.taches WHERE centre_poste_id = :cp")
        rows = conn.execute(sql_ids, {"cp": CENTER_ID}).mappings().all()
        ids_to_update = [r['id'] for r in rows]
        
        if not ids_to_update:
            print("No tasks found for this center!")
            return

        print(f"Updating IDs: {ids_to_update}")

        # 2. Update these specific IDs
        sql_update = text(f"""
            UPDATE dbo.taches
            SET flux_id = :f, sens_id = :s, segment_id = :sg
            WHERE id IN ({','.join(map(str, ids_to_update))})
        """)
        
        conn.execute(sql_update, {"f": FLUX_ID, "s": SENS_ID, "sg": SEG_ID})
        print("Update executed.")
        
        # 3. Verify
        sql_verify = text(f"""
            SELECT id, libelle, flux_id, sens_id, segment_id 
            FROM dbo.taches 
            WHERE id IN ({','.join(map(str, ids_to_update))})
        """)
        rows = conn.execute(sql_verify).mappings().all()
        print(f"Verified Tasks ({len(rows)}):")
        for r in rows:
            print(f" - {r['id']}: {r['libelle']} (F={r['flux_id']} S={r['sens_id']} SG={r['segment_id']})")

if __name__ == "__main__":
    try:
        force_mock_tasks()
    except Exception as e:
        print(f"ERROR: {e}")

