import logging
logging.basicConfig(level=logging.ERROR) # Suppress INFO logs

from app.core.db import SessionLocal
from sqlalchemy import text

def check_data():
    db = SessionLocal()
    try:
        print("\n=== START DEBUG ===")
        print("Searching for 'VALFLEURI'...")
        # Trying to find the centre loosely
        sql_centre = "SELECT id, label, region_id, id_categorisation FROM dbo.centres WHERE label LIKE :term"
        rows = db.execute(text(sql_centre), {"term": "%VALFLEURI%"}).fetchall()
        
        if not rows:
            print("No centre found matching 'VALFLEURI'")
        
        for r in rows:
            print(f"FOUND CENTRE -> ID: {r.id}, Label: {r.label}, ID_CAT: {r.id_categorisation}")

        print("\n--- TABLE dbo.Categorisation CONTENT ---")
        sql_cat = "SELECT id_categorisation, label FROM dbo.Categorisation ORDER BY id_categorisation"
        rows_cat = db.execute(text(sql_cat)).fetchall()
        for r in rows_cat:
            print(f"CAT ENTRY -> ID: {r.id_categorisation}, Label: {r.label}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
        print("=== END DEBUG ===")

if __name__ == "__main__":
    check_data()
