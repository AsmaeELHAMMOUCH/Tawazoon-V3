
import sys
import os

# Add backend to path to allow imports from app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from app.core.db import engine

def fix_schema():
    with engine.connect() as conn:
        print("Attempting to alter table columns to FLOAT...")
        try:
            # SQL Server specific syntax
            # dbo.taches table
            
            # 1. Update moy_sec
            sql1 = text("ALTER TABLE dbo.taches ALTER COLUMN moy_sec FLOAT;")
            conn.execute(sql1)
            print("Updated column 'moy_sec' to FLOAT.")
        except Exception as e:
            print(f"Error updating moy_sec: {e}")

        try:
            # 2. Update base_calcul
            # Note: base_calcul might be used by integer calculations previously, allowing FLOAT now.
            sql2 = text("ALTER TABLE dbo.taches ALTER COLUMN base_calcul FLOAT;")
            conn.execute(sql2)
            print("Updated column 'base_calcul' to FLOAT.")
        except Exception as e:
            print(f"Error updating base_calcul: {e}")
            
        print("Schema update finished.")

if __name__ == "__main__":
    fix_schema()
