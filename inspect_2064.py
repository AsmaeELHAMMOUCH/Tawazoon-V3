
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

    centre_id = 2064
    print(f"--- Intervenants pour Centre {centre_id} ---")

    cursor.execute("""
        SELECT DISTINCT p.id, p.label, p.Code, cp.code_resp
        FROM centre_postes cp
        JOIN postes p ON cp.poste_id = p.id
        WHERE cp.centre_id = ?
    """, (centre_id,))
    
    rows = cursor.fetchall()
    for row in rows:
        print(f"   PosteID:{row[0]} | Label:{row[1]} | Code(Poste):{row[2]} | CodeResp(CP):{row[3]}")

    conn.close()
except Exception as e:
    print(f"Database error: {str(e)}")
