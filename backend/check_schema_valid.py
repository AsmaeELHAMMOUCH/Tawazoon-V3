import sys
import os

# Ajout du root au path
sys.path.append(os.getcwd())

try:
    from app.core.db import engine
    from sqlalchemy import inspect, text

    def check_schema():
        print("Checking schema via app engine...")
        inspector = inspect(engine)
        columns = inspector.get_columns('centres', schema='dbo')
        print(f"Columns in dbo.centres ({len(columns)}):")
        found = False
        for col in columns:
            print(f" - {col['name']} ({col['type']})")
            if 'aps' in col['name'].lower():
                found = True
                print(f"   >>> FOUND APS COLUMN: {col['name']}")
        
        if not found:
            print("❌ No APS column found!")

        # Check value for 1913
        print("\nChecking value for id=1913:")
        with engine.connect() as conn:
            try:
                # Try selecting T_APS specifically (if found) or generic
                row = conn.execute(text("SELECT * FROM dbo.centres WHERE id=1913")).mappings().one()
                print(dict(row))
            except Exception as e:
                print(f"Error fetching row: {e}")

except Exception as e:
    print(f"Setup Error: {e}")

if __name__ == "__main__":
    check_schema()
