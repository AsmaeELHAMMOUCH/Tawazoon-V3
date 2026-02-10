import sys
import os

# Ajoute le dossier courant au path pour trouver 'app'
# On assume qu'on est à la racine du projet ou dans backend
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Poste, Centre

def check_postes(centre_id):
    db = SessionLocal()
    try:
        print(f"--- Checking Postes for Centre {centre_id} ---")
        
        # 1. Vérifier si le centre existe
        c = db.query(Centre).filter(Centre.id == centre_id).first()
        if not c:
            print("Centre NOT FOUND")
            return

        print(f"Centre: {c.label}")
        sys.stdout.flush()

        # 2. Compter les postes liés via CentrePoste
        count = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).count()
        print(f"Count CentrePoste: {count}")
        sys.stdout.flush()

        # 3. Lister quelques postes
        rows = (
            db.query(Poste.label, Poste.type_poste, CentrePoste.effectif_actuel)
            .join(CentrePoste)
            .filter(CentrePoste.centre_id == centre_id)
            .limit(5)
            .all()
        )
        for label, ptype, eff in rows:
            print(f" - {label} ({ptype}) : {eff}")
        sys.stdout.flush()
            
    finally:
        db.close()

if __name__ == "__main__":
    check_postes(1942)
