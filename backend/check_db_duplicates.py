
import sys
import os
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache

def check_tasks():
    db = SessionLocal()
    try:
        print("--- SEARCHING TASKS ---")
        tasks = db.query(Tache).filter(Tache.nom_tache.ilike("%ecriture n%")).all()
        for t in tasks:
            print(f"ID={t.id_tache} NOM='{t.nom_tache}' FAM='{t.famille_uo}' PROD='{t.produit}' UNIT='{t.unite_mesure}' BASE='{t.base_calcul}'")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_tasks()
