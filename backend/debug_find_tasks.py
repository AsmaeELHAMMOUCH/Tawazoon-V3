
import sys
import codecs

# Force stdout to utf-8
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

    print("--- Searching for ANY tasks related to 'Messagerie' or 'Fes' ---")
    
    # 1. Search tasks by name directly (ignoring links)
    sql_tasks = """
    SELECT TOP 20 t.id, t.nom_tache, cp.centre_id, c.label as centre_label
    FROM Taches t
    LEFT JOIN Centre_Postes cp ON t.centre_poste_id = cp.id
    LEFT JOIN Centres c ON cp.centre_id = c.id
    WHERE t.nom_tache LIKE '%MESSAGERIE%' OR t.nom_tache LIKE '%FES%'
    """
    
    tasks = db.execute(text(sql_tasks)).mappings().all()
    
    if tasks:
        print(f"Found {len(tasks)} tasks matching keywords:")
        for t in tasks:
            print(f" - Task {t['id']}: {t['nom_tache']} -> Centre: {t['centre_label']} (ID: {t['centre_id']})")
    else:
        print("No tasks found with 'Messagerie' or 'Fes' in the name.")

    # 2. Check if Centre 1913 has ANY linked data (orphaned?)
    print("\n--- Checking Centre 1913 content deep dive ---")
    sql_1913 = """
    SELECT 
        (SELECT count(*) FROM Centre_Postes WHERE centre_id = 1913) as cp_count,
        (SELECT count(*) FROM Taches t JOIN Centre_Postes cp ON t.centre_poste_id = cp.id WHERE cp.centre_id = 1913) as task_count
    """
    counts = db.execute(text(sql_1913)).mappings().one()
    print(f"Centre 1913: {counts['cp_count']} Postes, {counts['task_count']} Tasks")

    if counts['cp_count'] > 0 and counts['task_count'] == 0:
        print("\nStructure exists (Postes) but is empty (No Tasks).")
        print("This center needs to be initialized/populated.")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if 'db' in locals():
        db.close()
