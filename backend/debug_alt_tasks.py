
import sys
import codecs
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from sqlalchemy import create_engine, text
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
    print("\n--- CHECKING ALTERNATIVE TASK TABLES ---")
    
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            count = conn.execute(text("SELECT count(*) FROM Tache_Postale")).scalar()
            print(f"Rows in Tache_Postale: {count}")
            if count > 0:
                rows = conn.execute(text("SELECT TOP 5 * FROM Tache_Postale")).mappings().all()
                for r in rows:
                    print(r)
        except Exception as e:
            print(f"Tache_Postale query failed: {e}")

        try:
            count = conn.execute(text("SELECT count(*) FROM Tache_recetail")).scalar()
            print(f"Rows in Tache_recetail: {count}")
        except:
             pass

except Exception as e:
    print(f"Error: {e}")
