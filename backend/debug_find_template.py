
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
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("\n--- Content of Centre 1913 (Messagerie Fes) ---")
    sql_postes = """
    SELECT cp.id, p.label, p.type_poste, p.Code
    FROM Centre_Postes cp
    JOIN Postes p ON cp.poste_id = p.id
    WHERE cp.centre_id = 1913
    """
    postes = db.execute(text(sql_postes)).mappings().all()
    for p in postes:
        print(f" - Poste: {p['label']} (Type: {p['type_poste']}, Code: {p['Code']})")

    print("\n--- Checking for 'Template' Messagerie Center ---")
    # Search for any Messagerie center with tasks
    sql_template = """
    SELECT TOP 5 c.id, c.label, count(t.id) as task_count
    FROM Centres c
    JOIN Centre_Postes cp ON c.id = cp.centre_id
    JOIN Taches t ON cp.id = t.centre_poste_id
    WHERE c.label LIKE '%MESSAGERIE%' AND c.id != 1913
    GROUP BY c.id, c.label
    HAVING count(t.id) > 0
    ORDER BY task_count DESC
    """
    templates = db.execute(text(sql_template)).mappings().all()
    
    if templates:
        print(f"Found {len(templates)} potential templates:")
        for t in templates:
            print(f" - [ID {t['id']}] {t['label']}: {t['task_count']} tasks")
    else:
        print("No other Messagerie centers with tasks found.")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if 'db' in locals():
        db.close()
