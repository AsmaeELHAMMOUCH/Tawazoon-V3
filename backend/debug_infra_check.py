
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
    display_limit = 20
    
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("\n--- DISTINCT TYPE_CENTRE ---")
    types = db.execute(text("SELECT DISTINCT type_centre FROM Centres")).mappings().all()
    for t in types:
        print(f" - {t['type_centre']}")

    print("\n--- FINDING ANY CENTER WITH TASKS (Sample) ---")
    sql_sample = """
    SELECT TOP 5 c.id, c.label, c.type_centre, count(t.id) as task_count
    FROM Centres c
    JOIN Centre_Postes cp ON c.id = cp.centre_id
    JOIN Taches t ON cp.id = t.centre_poste_id
    GROUP BY c.id, c.label, c.type_centre
    ORDER BY task_count DESC
    """
    samples = db.execute(text(sql_sample)).mappings().all()
    for s in samples:
         print(f" - [{s['id']}] {s['label']} ({s['type_centre']}): {s['task_count']} tasks")

    print("\n--- CHECKING IF ID 1913 HAS A DUPLICATE ---")
    dupes = db.execute(text("SELECT id, label, type_centre FROM Centres WHERE label LIKE '%Messagerie%Fes%' OR label LIKE '%Messagerie%Fès%'")).mappings().all()
    for d in dupes:
        print(f" - [{d['id']}] {d['label']} ({d['type_centre']})")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if 'db' in locals():
        db.close()
