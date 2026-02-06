
import sys
import os

# Add the backend directory to sys.path
# Assuming this script is run from the project root (c:\Users\Aelhammouch\simulateur-rh-V2)
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from app.core.db import engine

def fix_schema():
    print("Connecting to database...")
    with engine.connect() as conn:
        print("Connected. Attempting to alter columns to FLOAT.")
        
        # 1. Update moy_sec
        try:
            sql1 = text("ALTER TABLE dbo.taches ALTER COLUMN moy_sec FLOAT;")
            conn.execute(sql1)
            print("✅ Successfully changed 'moy_sec' to FLOAT.")
        except Exception as e:
            print(f"❌ Error updating 'moy_sec': {e}")

        # 2. Update base_calcul
        try:
            sql2 = text("ALTER TABLE dbo.taches ALTER COLUMN base_calcul FLOAT;")
            conn.execute(sql2)
            print("✅ Successfully changed 'base_calcul' to FLOAT.")
        except Exception as e:
            print(f"❌ Error updating 'base_calcul': {e}")
            
    print("Schema update process finished.")

if __name__ == "__main__":
    fix_schema()
