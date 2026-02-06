from app.core.db import SessionLocal
from sqlalchemy import text

def inspect_schema():
    db = SessionLocal()
    try:
        print("--- Tables ---")
        res = db.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"))
        tables = [r[0] for r in res]
        print(tables)

        print("\n--- Columns in 'postes' ---")
        res = db.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'postes'"))
        columns = [r[0] for r in res]
        print(columns)
        
        # Try to find a hierarchy table match
        hie_table = next((t for t in tables if 'hie' in t.lower()), None)
        if hie_table:
            print(f"\n--- Columns in '{hie_table}' ---")
            res = db.execute(text(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{hie_table}'"))
            print([r[0] for r in res])
            
            print(f"\n--- Content of '{hie_table}' (Top 5) ---")
            res = db.execute(text(f"SELECT TOP 5 * FROM {hie_table}"))
            rows = res.fetchall()
            if rows:
                 # Print keys/columns if possible, referencing the result keys
                 print(res.keys())
                 for r in rows:
                     print(r)
            else:
                print("Table is empty")
        else:
            print("\nNo table found matching 'hie'")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_schema()
