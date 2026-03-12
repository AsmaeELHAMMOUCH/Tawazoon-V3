from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste
from sqlalchemy import func

def debug_task():
    db = SessionLocal()
    try:
        centre_id = 1922
        # On cherche la tâche "Tri par destination" pour le centre 1922
        taches = (
            db.query(Tache)
            .join(CentrePoste)
            .filter(CentrePoste.centre_id == centre_id)
            .all()
        )
        
        print(f"Nombre total de tâches pour le centre {centre_id}: {len(taches)}")
        
        target_taches = [t for t in taches if "TRI" in (t.nom_tache or "").upper() and "DESTINATION" in (t.nom_tache or "").upper()]
        
        if not target_taches:
            print("Aucune tâche 'Tri par destination' trouvée. Voici quelques tâches du centre:")
            for t in taches[:10]:
                print(f"- {t.nom_tache} | Produit: {t.produit} | Famille: {t.famille_uo}")
            return

        for t in target_taches:
            print(f"--- Tâche trouvée ---")
            print(f"ID: {t.id}")
            print(f"Nom: {t.nom_tache}")
            print(f"Produit: {t.produit}")
            print(f"Famille UO: {t.famille_uo}")
            print(f"Phase: {t.phase}")
            print(f"Unité Mesure: {t.unite_mesure}")
            print(f"Moy Sec: {t.moy_sec}")
            print(f"Base Calcul: {t.base_calcul}")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_task()
