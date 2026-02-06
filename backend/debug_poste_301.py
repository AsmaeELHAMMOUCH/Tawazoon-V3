import sys
import os
# Add 'backend' to sys.path so 'app' can be imported
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
print("Sys Path:", sys.path)

from app.core.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # 1. Get Poste Name
    row = db.execute(text("SELECT label, type_poste FROM postes WHERE id = 301")).fetchone()
    if row:
        print(f"Poste 301: {row[0]} (Type: {row[1]})")
    else:
        print("Poste 301 not found")

    # 2. Get Tasks associated with this poste for CCP (Center 1962 is standard CCP)
    # We need to find the centre_poste_id for Centre 1962 and Poste 301
    cp_row = db.execute(text("SELECT id FROM centre_postes WHERE centre_id = 1962 AND poste_id = 301")).fetchone()
    
    if cp_row:
        cp_id = cp_row[0]
        print(f"CentrePoste ID for 1962/301: {cp_id}")
        
        # 3. Get Tasks
        tasks = db.execute(text("SELECT nom_tache, moyenne_min, unite_mesure, famille_uo FROM taches WHERE centre_poste_id = :cpid"), {"cpid": cp_id}).fetchall()
        print(f"\nTasks for Poste 301 ({len(tasks)} found):")
        for t in tasks:
            print(f"- {t[0]} (Moy: {t[1]}, Unit: {t[2]})")
            
    else:
        print("Link Centre-Poste (1962-301) not found")

finally:
    db.close()
