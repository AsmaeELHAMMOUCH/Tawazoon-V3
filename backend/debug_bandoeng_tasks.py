
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

    print("Checking tasks for Centre 1942 (Bandoeng)...")
    
    # We select tasks linked to Centre 1942 and verify their associated Poste type
    sql = """
    SELECT 
        t.nom_tache, 
        t.id as tache_id,
        t.etat,
        t.produit,           -- Added
        t.unite_mesure,      -- Added
        cp.id as centre_poste_id,
        p.label as poste_label, 
        p.type_poste,
        p.Code as poste_code
    FROM Taches t
    JOIN Centre_Postes cp ON t.centre_poste_id = cp.id
    JOIN Postes p ON cp.poste_id = p.id
    WHERE cp.centre_id = 1942
    ORDER BY p.type_poste, t.produit
    """
    
    result = db.execute(text(sql)).mappings().all()
    
    print(f"Found {len(result)} tasks.")
    
    metrics = {}
    
    print(f"Writing results to backend/tasks_dump.txt...")
    with open("backend/tasks_dump.txt", "w", encoding="utf-8") as f:
        f.write(f"{'TASK ID':<8} | {'TASK NAME':<30} | {'PRODUIT':<20} | {'UNITE':<10} | {'POSTE LABEL':<25} | {'TYPE':<5} | {'ETAT':<8}\n")
        f.write("-" * 130 + "\n")
        
        for row in result:
            t_type = row['type_poste'] if row['type_poste'] else 'NULL'
            metrics[t_type] = metrics.get(t_type, 0) + 1
            
            prod = (row['produit'] or '')[:20]
            nom = (row['nom_tache'] or '')[:30]
            unite = (row['unite_mesure'] or '')[:10]
            poste = (row['poste_label'] or '')[:25]
            
            f.write(f"{row['tache_id']:<8} | {nom:<30} | {prod:<20} | {unite:<10} | {poste:<25} | {t_type:<5} | {row['etat'] or '':<8}\n")

        f.write("\nSummary by Type Poste:\n")
        for t_type, count in metrics.items():
            f.write(f"  {t_type}: {count}\n")
    print("Done.")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
finally:
    if 'db' in locals():
        db.close()
