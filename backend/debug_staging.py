
import sys
import codecs
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import urllib

# Construct connection string from .env
DB_DRIVER = "ODBC Driver 17 for SQL Server"
DB_SERVER = "BK-P-07,1433"
DB_NAME = "Simulateur"
DB_USER = "sa"
DB_PASSWORD = "Sql@123"

connection_string = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
    f"TrustServerCertificate=yes;"
)

try:
    print("\n--- CHECKING IMPORT STAGING TABLES ---")
    
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Check stg_taches_import
    # Inspect columns first to know what to query
    
    # Try generic count on stg_taches_import
    try:
        count = db.execute(text("SELECT count(*) FROM stg_taches_import")).scalar()
        print(f"Rows in stg_taches_import: {count}")
        
        if count > 0:
            sample = db.execute(text("SELECT TOP 5 * FROM stg_taches_import")).mappings().all()
            print("Sample data:")
            for s in sample:
                print(s)
    except Exception as ie:
        print(f"Could not query stg_taches_import: {ie}")

    # Check stg_import_csv
    try:
        count = db.execute(text("SELECT count(*) FROM stg_import_csv")).scalar()
        print(f"Rows in stg_import_csv: {count}")
    except:
        pass

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if 'db' in locals():
        db.close()
