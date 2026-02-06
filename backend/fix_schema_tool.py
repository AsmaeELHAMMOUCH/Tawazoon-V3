
import sys
import os

# Make sure we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.db import engine

def fix_schema():
    log_path = os.path.join(os.path.dirname(__file__), "db_fix_log.txt")
    # Use utf-8 to avoid encoding errors
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("Starting schema update...\n")
        try:
             with engine.connect() as conn:
                f.write("Connected to database.\n")
                
                # 1. Update moy_sec (Already done, but harmless to retry or skip)
                try:
                    f.write("Checking moy_sec...\n")
                    conn.execute(text("ALTER TABLE dbo.taches ALTER COLUMN moy_sec FLOAT;"))
                    f.write("SUCCESS: 'moy_sec' is FLOAT.\n")
                except Exception as e:
                    f.write(f"Info/Error 'moy_sec': {e}\n")

                # 2. Update base_calcul - Force Drop/Add to handle type mismatch
                try:
                    f.write("Attempting to DROP and ADD base_calcul to force FLOAT...\n")
                    # Check if column exists is hard in raw sql cross-platform, but we can just try drop
                    try:
                        conn.execute(text("ALTER TABLE dbo.taches DROP COLUMN base_calcul;"))
                    except:
                        pass # Maybe it doesn't exist
                        
                    conn.execute(text("ALTER TABLE dbo.taches ADD base_calcul FLOAT;"))
                    f.write("SUCCESS: Recreated 'base_calcul' as FLOAT.\n")
                except Exception as e:
                    f.write(f"ERROR updating 'base_calcul': {e}\n")
        except Exception as e:
            f.write(f"Global error: {e}\n")
            
    print("Log written to db_fix_log.txt")

if __name__ == "__main__":
    fix_schema()
