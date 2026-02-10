
import pyodbc
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.core.config import settings
    connection_string = f"{settings.DATABASE_URL}"
    if not connection_string.startswith("DRIVER="):
        connection_string = f"Driver={{ODBC Driver 17 for SQL Server}};{connection_string}"
except Exception as e:
    print(f"Error loading settings: {str(e)}")
    exit(1)

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()

    cid = 2064
    print(f"--- Analyse Centre {cid} (Postes avec CodeResp NULL) ---")
    
    # On regarde si Poste.Code existe mais CentrePoste.code_resp est NULL
    cursor.execute("""
        SELECT cp.id, cp.code_resp, cp.poste_id, p.Code, p.type_poste, p.label,
               (SELECT COUNT(*) FROM taches t WHERE t.centre_poste_id = cp.id) as nb_taches
        FROM centre_postes cp
        LEFT JOIN postes p ON cp.poste_id = p.id
        WHERE cp.centre_id = ? AND (cp.code_resp IS NULL OR cp.code_resp = '')
    """, (cid,))
    
    rows = cursor.fetchall()
    print(f"Postes sans CodeResp sur CP: {len(rows)}")
    for row in rows:
        if row[6] > 0:
            print(f"   - CP:{row[0]} | CodeResp(CP):{row[1]} | Code(Poste):{row[3]} | Type:{row[4]} | Label:{row[5]} | Taches:{row[6]}")

    conn.close()
except Exception as e:
    print(f"Database error: {str(e)}")
