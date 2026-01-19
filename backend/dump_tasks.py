
import sys
import os
import logging
sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache

def check_tasks():
    db = SessionLocal()
    output = []
    try:
        tasks = db.query(Tache).filter(Tache.nom_tache.ilike("%ecriture n%")).all()
        for t in tasks:
            # Use 'id' instead of 'id_tache'
            line = f"ID={t.id} NOM='{t.nom_tache}' FAM='{t.famille_uo}' PROD='{getattr(t, 'produit', 'N/A')}' UNIT='{getattr(t, 'unite_mesure', 'N/A')}' BASE='{getattr(t, 'base_calcul', 'N/A')}'"
            output.append(line)
            
    except Exception as e:
        output.append(f"ERROR: {e}")
    finally:
        db.close()
    
    with open("task_dump.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    check_tasks()
