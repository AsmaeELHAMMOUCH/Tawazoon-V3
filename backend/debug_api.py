import logging
logging.basicConfig(level=logging.ERROR)

from app.core.db import SessionLocal
from sqlalchemy import text

def check_queries():
    db = SessionLocal()
    try:
        print("\n=== DEBUG API QUERIES ===")
        
        # 1. Simulate list_centres query
        print("\n[Query: list_centres]")
        # This is the exact query from refs.py (simplified slightly)
        sql_centres = """
        SELECT
          c.id,
          c.label,
          c.id_categorisation
        FROM dbo.centres c
        WHERE c.label LIKE :term
        """
        rows = db.execute(text(sql_centres), {"term": "%VALFLEURI%"}).fetchall()
        for r in rows:
            print(f"CENTRE ROW -> ID: {r.id}, Label: {r.label}, ID_CAT: {r.id_categorisation}")

        # 2. Simulate list_categorisations query
        print("\n[Query: list_categorisations]")
        sql_cats = """
        SELECT id_categorisation as id, label
        FROM dbo.Categorisation
        ORDER BY label
        
        """
        rows_cat = db.execute(text(sql_cats)).fetchall()
        for r in rows_cat:
            print(f"CAT ROW -> ID: {r.id}, Label: {r.label}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
        print("=== END DEBUG ===")

if __name__ == "__main__":
    check_queries()
