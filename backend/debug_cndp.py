
from sqlalchemy import text
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import SessionLocal

db = SessionLocal()

centre_id = 1965
# Le log indique: "ID Poste initial: 196 ➡️ ID Poste résolu: 8390"
# Si le frontend envoie 196 (Poste.id), le backend filter(CentrePoste.poste_id == 196) devrait marcher.
# Si le frontend envoie 8390 (CentrePoste.id), il faut voir.

poste_id_from_front = 196
centre_poste_id_resolved = 8390 

print(f"--- Debugging CNDP Tasks for Centre {centre_id} ---")

# 1. Check CentrePoste using Poste ID (196)
sql_cp_by_poste = """
SELECT id, centre_id, poste_id, effectif_actuel 
FROM dbo.centre_postes 
WHERE centre_id = :cid AND poste_id = :pid
"""
cp = db.execute(text(sql_cp_by_poste), {"cid": centre_id, "pid": poste_id_from_front}).mappings().first()

if cp:
    print(f"[FOUND] CentrePoste FOUND via PosteID {poste_id_from_front}: ID={cp['id']} (Matches resolved {centre_poste_id_resolved}?), Centre={cp['centre_id']}")
    real_cp_id = cp['id']
else:
    print(f"[NOT FOUND] CentrePoste NOT FOUND via PosteID {poste_id_from_front}.")
    real_cp_id = None

# Check CentrePoste using ID (8390) explicitly
sql_cp_by_id = """
SELECT id, centre_id, poste_id
FROM dbo.centre_postes 
WHERE id = :cpid
"""
cp2 = db.execute(text(sql_cp_by_id), {"cpid": centre_poste_id_resolved}).mappings().first()
if cp2:
     print(f"[FOUND] CentrePoste FOUND via ID {centre_poste_id_resolved}: PosteID={cp2['poste_id']}, Centre={cp2['centre_id']}")
else:
     print(f"[NOT FOUND] CentrePoste NOT FOUND via ID {centre_poste_id_resolved}.")


target_cp_id = real_cp_id if real_cp_id else (centre_poste_id_resolved if cp2 else None)

if target_cp_id:
    # 2. Check Taches using CentrePoste ID
    sql_taches = """
    SELECT id, nom_tache, centre_poste_id, unite_mesure, moyenne_min
    FROM dbo.taches
    WHERE centre_poste_id = :cpid
    """
    taches = db.execute(text(sql_taches), {"cpid": target_cp_id}).mappings().all()
    print(f"[SUCCESS] Found {len(taches)} tasks linked to CentrePoste {target_cp_id}:")
    for t in taches:
        print(f"   - [{t['id']}] {t['nom_tache']} (Unit: {t['unite_mesure']}, Avg: {t['moyenne_min']})")
else:
    print("⚠️ Cannot check tasks because CentrePoste was not identified.")

db.close()
