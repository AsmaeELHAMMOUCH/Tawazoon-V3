
import sys
import codecs
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

from sqlalchemy import create_engine, inspect
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
    print("\n--- LISTING ALL TABLES ---")
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(DATABASE_URL)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    for t in tables:
        print(f" - {t}")
        # Check if table has 'Messagerie' in name
        if "MESSAGERIE" in t.upper() or "REF" in t.upper():
            print(f"   *** POTENTIAL MATCH: {t} ***")

except Exception as e:
    print(f"Error: {e}")
