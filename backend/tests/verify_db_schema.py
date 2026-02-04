
import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db, engine

def verify_schema():
    print("Connecting to database...")
    try:
        inspector = inspect(engine)
        
        print("\n--- API/POSTES CHECK ---")
        # Check if basic query works
        with engine.connect() as conn:
            try:
                result = conn.execute(text("SELECT TOP 1 id, label FROM dbo.postes"))
                print("Basic query (SELECT id, label FROM dbo.postes) SUCCESS.")
            except Exception as e:
                print(f"Basic query FAILED: {e}")

        print("\n--- POSTE Table Columns ---")
        columns = [c['name'] for c in inspector.get_columns('postes', schema='dbo')]
        print(f"Columns in dbo.postes: {columns}")
        
        has_code = 'Code' in columns or 'code' in columns
        print(f"Has 'Code' column: {has_code}")

        print("\n--- CENTRE_POSTES Table Columns ---")
        cp_columns = [c['name'] for c in inspector.get_columns('centre_postes', schema='dbo')]
        print(f"Columns in dbo.centre_postes: {cp_columns}")
        
        has_code_resp = 'code_resp' in cp_columns
        print(f"Has 'code_resp' column: {has_code_resp}")
        
    except Exception as e:
        print(f"Error inspecting DB: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_schema()
