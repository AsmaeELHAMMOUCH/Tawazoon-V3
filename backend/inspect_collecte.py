
print("STARTING SCRIPT NOW")
import sys
import os
import logging

logging.basicConfig(level=logging.ERROR)

backend_path = r"c:\Users\Aelhammouch\simulateur-rh-V2\backend"
if backend_path not in sys.path:
    sys.path.append(backend_path)

with open("result_collecte.txt", "w", encoding="utf-8") as f:
    try:
        from app.core.db import SessionLocal
        from app.models.db_models import Tache
        
        db = SessionLocal()
        
        f.write("--- Recherche Tâches COLLECTE ---\n")
        
        # Recherche par mot clé 'Confirmation réception'
        taches = db.query(Tache).filter(
            Tache.nom_tache.ilike("%Confirmation réception scan%")
        ).limit(10).all()

        for t in taches:
            f.write(f"ID: {t.id}\n")
            f.write(f"Nom: {t.nom_tache}\n")
            f.write(f"CP ID: {t.centre_poste_id}\n")
            f.write(f"Produit: {t.produit}\n")
            f.write(f"Famille UO: {t.famille_uo}\n")
            f.write(f"Base Calcul: {t.base_calcul}\n")
            f.write("-" * 30 + "\n")

        # Recherche par mot clé 'Taxation'
        taches2 = db.query(Tache).filter(
            Tache.nom_tache.ilike("%Taxation : Saisie excel%")
        ).limit(10).all()
        
        for t in taches2:
             f.write(f"ID: {t.id}\n")
             f.write(f"Nom: {t.nom_tache}\n")
             f.write(f"Produit: {t.produit}\n")
             f.write(f"Famille UO: {t.famille_uo}\n")
             f.write("-" * 30 + "\n")

        db.close()

    except Exception as e:
        f.write(f"ERROR: {e}\n")
