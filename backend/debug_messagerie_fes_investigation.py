
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

print(f"Connecting to: {connection_string}")

try:
    params = urllib.parse.quote_plus(connection_string)
    DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("\n--- Searching for Centers ---")
    
    # 1. Find all potential matches
    sql_centres = "SELECT id, label, type_centre FROM Centres WHERE label LIKE :label1 OR label LIKE :label2"
    centres = db.execute(text(sql_centres), {"label1": "%Messagerie%Fes%", "label2": "%Messagerie%Fès%"}).mappings().all()

    target_center_id = None

    if not centres:
        print("No exact match found.")
    else:
        print(f"Found {len(centres)} centers:")
        for c in centres:
            print(f" - [{c['id']}] {c['label']} (Type: {c['type_centre']})")
            if c['id'] == 1913: target_center_id = 1913
            if not target_center_id: target_center_id = c['id']

    if not target_center_id:
        # Fallback to 1913 provided in context
        target_center_id = 1913
        print(f"Using default ID: {target_center_id}")

    print(f"\n--- Analyzing Centre ID {target_center_id} ---")

    # 2. Check Centre_Postes
    sql_cp = """
    SELECT cp.id, cp.poste_id, p.label as poste_label, p.type_poste, p.Code as poste_code
    FROM Centre_Postes cp
    JOIN Postes p ON cp.poste_id = p.id
    WHERE cp.centre_id = :cid
    """
    cps = db.execute(text(sql_cp), {"cid": target_center_id}).mappings().all()
    print(f"Centre_Postes found: {len(cps)}")
    
    cp_ids = [row['id'] for row in cps]
    
    if cps:
        print(f"Sample Postes ({min(5, len(cps))} of {len(cps)}):")
        for row in cps[:5]:
             print(f" - CP {row['id']} -> Poste {row['poste_label']} (Type: {row['type_poste']})")
    
    # 3. Check Tasks directly linked
    if cp_ids:
        # We handle list manually for SQL safety generally, but here just use IN
        # If list is huge MSSQL might complain but for <2000 it is fine.
        if len(cp_ids) > 0:
            sql_tasks = f"""
            SELECT count(*) as count 
            FROM Taches 
            WHERE centre_poste_id IN ({','.join(map(str, cp_ids))})
            """
            count_res = db.execute(text(sql_tasks)).scalar()
            print(f"\nTasks directly linked to these Centre_Postes: {count_res}")
            
            if count_res == 0:
                print("CRITICAL: Postes exist but have NO attached tasks.")
            else:
                 # Check Filter Breakdown
                 sql_types = f"""
                 SELECT p.type_poste, count(t.id) as task_count
                 FROM Taches t
                 JOIN Centre_Postes cp ON t.centre_poste_id = cp.id
                 JOIN Postes p ON cp.poste_id = p.id
                 WHERE cp.centre_id = :cid
                 GROUP BY p.type_poste
                 """
                 types = db.execute(text(sql_types), {"cid": target_center_id}).mappings().all()
                 print("\nTask count by Poste Type:")
                 for t in types:
                     print(f" - {t['type_poste']}: {t['task_count']}")
    
    else:
        print("CRITICAL: No Postes attached to this Center. This explains why no tasks appear.")

    # 4. Check for "Orphaned" tasks that might share the name but not the ID?
    # unlikely given the structure.
    
    # 5. Check if Reference Tasks exist for "MESSAGERIE"
    # Maybe the user expects tasks to be auto-populated from a template?
    print("\n--- Checking Reference/Template Tasks for 'MESSAGERIE' ---")
    sql_ref = """
    SELECT count(*) 
    FROM Taches t 
    JOIN Centre_Postes cp ON t.centre_poste_id = cp.id
    JOIN Centres c ON cp.centre_id = c.id
    WHERE c.label LIKE '%GABARIT%' OR c.label LIKE '%TEMPLATE%'
    """
    ref_count = db.execute(text(sql_ref)).scalar()
    print(f"Template tasks in system: {ref_count}")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
finally:
    if 'db' in locals():
        db.close()
