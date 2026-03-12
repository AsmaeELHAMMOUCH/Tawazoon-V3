from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste
from sqlalchemy import func

def debug_amana_tasks():
    db = SessionLocal()
    try:
        centre_id = 1922
        taches = (
            db.query(Tache)
            .join(CentrePoste)
            .filter(CentrePoste.centre_id == centre_id)
            .filter(Tache.produit.like('%AMANA%'))
            .all()
        )
        
        print(f"--- Tâches AMANA pour le centre {centre_id} ---")
        for t in taches:
            print(f"ID: {t.id} | Nom: {t.nom_tache:30} | Produit: {t.produit:20} | Phase: {t.phase:15} | Unit: {t.unite_mesure}")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug_amana_tasks()
