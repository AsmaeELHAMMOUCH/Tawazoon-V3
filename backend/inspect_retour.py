
print("STARTING SCRIPT NOW")
import sys
import os
import logging

logging.basicConfig(level=logging.ERROR)

backend_path = r"c:\Users\Aelhammouch\simulateur-rh-V2\backend"
if backend_path not in sys.path:
    sys.path.append(backend_path)

with open("result_retour.txt", "w", encoding="utf-8") as f:
    try:
        from app.core.db import SessionLocal
        from app.models.db_models import Tache
        
        db = SessionLocal()
        
        f.write("--- Recherche Tâches RETOUR Global ---\n")
        
        taches = db.query(Tache).filter(
            Tache.nom_tache.ilike("%Retour%"),
        ).limit(50).all()

        for t in taches:
            f.write(f"ID: {t.id}\n")
            f.write(f"Nom: {t.nom_tache}\n")
            f.write(f"CP ID: {t.centre_poste_id}\n")
            f.write(f"Produit: {t.produit}\n")
            f.write(f"Famille UO: {t.famille_uo}\n")
            f.write("-" * 30 + "\n")

        db.close()

    except Exception as e:
        f.write(f"ERROR: {e}\n")
