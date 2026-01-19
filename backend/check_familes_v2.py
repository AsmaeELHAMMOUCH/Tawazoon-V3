import sys
import os

# Ajout du path pour trouver app
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend')) 

from app.core.db import SessionLocal
from app.models.db_models import Tache
from sqlalchemy import distinct, text

print("--- START QUERY ---")
try:
    db = SessionLocal()
    # Utiliser SQL brut pour éviter les soucis de modèle si possible, ou juste query
    familles = db.query(distinct(Tache.famille_uo)).all()
    print(f"Found {len(familles)} families.")
    for f in familles:
        val = f[0]
        if val:
             print(f"FAMILLE: '{val}'")
        else:
             print("FAMILLE: None/Empty")
    db.close()
except Exception as e:
    print(f"ERROR: {e}")
print("--- END QUERY ---")
