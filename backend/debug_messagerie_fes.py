
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

    # Need to find "agence messagerie fes" centre_id
    print("Finding 'Agence Messagerie Fes' ID...")
    
    # Try different name variations
    names = [
        "Agence Messagerie Fes", 
        "Messagerie Fes", 
        "ME Fes",
        "ME Fès",
        "Agence ME Fes", 
        "Agence ME Fès"
    ]
    
    centre_id = None
    centre_label = None
    
    # Check Centres
    sql_centres = "SELECT id, label FROM Centres WHERE label LIKE :label"
    
    results_found = []
    
    # Try wildcards
    search_terms = ['%Messagerie%Fes%', '%Messagerie%Fès%']
    for term in search_terms:
         res = db.execute(text(sql_centres), {"label": term}).mappings().all()
         for r in res:
             results_found.append(r)

    if not results_found:
        print("Could not find 'Agence Messagerie Fes' automatically. Searching all 'Messagerie'...")
        res = db.execute(text("SELECT id, label FROM Centres WHERE label LIKE '%Messagerie%'")).mappings().all()
        for r in res:
             results_found.append(r)

    if not results_found:
        print("No Centre found. Exiting.")
        exit()

    print(f"Found {len(results_found)} potential centres:")
    for r in results_found:
        print(f" - ID: {r['id']}, Label: {r['label']}")
        if "Fes" in r['label'] or "Fès" in r['label']:
             centre_id = r['id']
             centre_label = r['label']
             # break? keep looking to see all

    if not centre_id: 
         # Pick first
         centre_id = results_found[0]['id']
         centre_label = results_found[0]['label']
    
    print(f"\nAnalyzing Centre: {centre_label} (ID: {centre_id})")

    # Now verify tasks
    sql = """
    SELECT 
        t.nom_tache, 
        t.id as tache_id,
        t.etat,
        cp.id as centre_poste_id,
        p.label as poste_label, 
        p.type_poste,
        p.Code as poste_code
    FROM Taches t
    JOIN Centre_Postes cp ON t.centre_poste_id = cp.id
    JOIN Postes p ON cp.poste_id = p.id
    WHERE cp.centre_id = :centre_id
    ORDER BY p.type_poste, t.nom_tache
    """
    
    tasks = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    
    print(f"Found {len(tasks)} tasks.")
    
    with open("backend/debug_messagerie_fes.txt", "w", encoding="utf-8") as f:
        f.write(f"Centre: {centre_label} (ID: {centre_id})\n")
        f.write(f"{'TASK ID':<8} | {'TASK NAME':<40} | {'POSTE LABEL':<30} | {'TYPE':<5} | {'ETAT':<8}\n")
        f.write("-" * 100 + "\n")
        
        for row in tasks:
            nom = (row['nom_tache'] or '')[:40]
            poste = (row['poste_label'] or '')[:30]
            t_type = row['type_poste'] or 'NULL'
            
            f.write(f"{row['tache_id']:<8} | {nom:<40} | {poste:<30} | {t_type:<5} | {row['etat'] or '':<8}\n")

    print(f"Details written to backend/debug_messagerie_fes.txt")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
finally:
    if 'db' in locals():
        db.close()
