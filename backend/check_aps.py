from sqlalchemy import create_engine, text
import os
import urllib

# Connection string setup (copied from db.py context)
server = r"DESKTOP-7R2C585\SQLEXPRESS"
database = "SimulateurRH_DB_V2"
driver = "ODBC Driver 17 for SQL Server"

params = urllib.parse.quote_plus(
    f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};Trusted_Connection=yes;"
)
DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(DATABASE_URL)

def check_aps_column():
    print(f"Connecting to database: {database}...")
    try:
        with engine.connect() as conn:
            # 1. Check table columns
            print("\n--- Columns in 'centres' table ---")
            result = conn.execute(text("SELECT TOP 1 * FROM dbo.centres"))
            keys = result.keys()
            print(keys)
            
            has_aps = any("APS" in k for k in keys)
            if has_aps:
                print(f"✅ Found APS column(s): {[k for k in keys if 'APS' in k]}")
            else:
                print("❌ No 'APS' column found in 'centres' table!")

            # 2. Check values for Centre ID=1913 (FES)
            print("\n--- Checking Data for Centre ID=1913 ---")
            query = text("SELECT id, label, T_APS FROM dbo.centres WHERE id = 1913")
            try:
                row = conn.execute(query).fetchone()
                if row:
                    print(f"Centre: {row.id} - {row.label}")
                    print(f"T_APS Value: {row.T_APS}")
                else:
                    print("Centre 1913 not found.")
            except Exception as e:
                print(f"Error checking T_APS value: {e}")
                # Fallback to check all T_APS
                print("Trying default SELECT * to see raw dict...")
                row = conn.execute(text("SELECT * FROM dbo.centres WHERE id=1913")).mappings().one()
                print(dict(row))

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    check_aps_column()
