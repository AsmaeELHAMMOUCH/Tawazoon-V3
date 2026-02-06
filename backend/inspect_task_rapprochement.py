
print("STARTING SCRIPT NOW")
import sys
import os
import logging

# Silence logs
logging.basicConfig(level=logging.ERROR)

backend_path = r"c:\Users\Aelhammouch\simulateur-rh-V2\backend"
if backend_path not in sys.path:
    sys.path.append(backend_path)

with open("result_task.txt", "w", encoding="utf-8") as f:
    f.write("--- START ---\n")
    try:
        from app.core.db import SessionLocal
        from app.models.db_models import Tache, CentrePoste
        
        db = SessionLocal()
        cp_id = 8367 

        f.write(f"--- Recherche de la tâche 'Rapprochement' pour le CP {cp_id} ---\n")

        taches = db.query(Tache).filter(
            Tache.centre_poste_id == cp_id,
            Tache.nom_tache.ilike("%Rapprochement%")
        ).all()

        if not taches:
            f.write("Aucune tâche trouvée pour ce CP. Recherche globale (limit 5)...\n")
            results = db.query(Tache).filter(Tache.nom_tache.ilike("%Rapprochement%")).limit(5).all()
            for t in results:
                 f.write(f"Found global: ID={t.id} CP={t.centre_poste_id} Name={t.nom_tache}\n")
        
        for t in taches:
            f.write(f"ID: {t.id}\n")
            f.write(f"Nom: {t.nom_tache}\n")
            f.write(f"CP ID: {t.centre_poste_id}\n")
            f.write(f"Produit: {t.produit}\n")
            f.write(f"Base Calcul: {t.base_calcul}\n")
            f.write(f"Unité: {t.unite_mesure}\n")
            f.write(f"Temps Unitaire (minutes): {t.temps_unitaire}\n")
            f.write("-" * 30 + "\n")
            
        db.close()

    except Exception as e:
        f.write(f"ERROR: {e}\n")
