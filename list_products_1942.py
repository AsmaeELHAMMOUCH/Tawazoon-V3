import sqlite3
import os

db_path = 'backend/tawazoon.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
centre_id = 1942
cur.execute("""
    SELECT DISTINCT produit 
    FROM Tache t 
    JOIN centre_poste cp ON t.centre_poste_id = cp.id 
    WHERE cp.centre_id = ?
""", (centre_id,))

rows = cur.fetchall()
print(f"Products for center {centre_id}:")
for r in rows:
    print(f"- {r[0]}")
conn.close()
