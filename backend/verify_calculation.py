import sys
import os
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models.db_models import Tache

def verify_calculations():
    db = SessionLocal()
    try:
        # Chercher les tâches "ecriture n° dépêches" avec différents produits
        tasks = db.query(Tache).filter(
            Tache.nom_tache.ilike("%ecriture n%dépêches%")
        ).filter(
            Tache.id.in_([12677, 12691])  # CR MED Caisson et CO MED Sac
        ).all()
        
        print("=== VÉRIFICATION DES CALCULS ===\n")
        
        for t in tasks:
            print(f"ID: {t.id}")
            print(f"  Nom: {t.nom_tache}")
            print(f"  Produit: {t.produit}")
            print(f"  Unité: {t.unite_mesure}")
            print(f"  Base: {t.base_calcul}")
            print(f"  Famille: {t.famille_uo}")
            
            # Déterminer quel bloc de calcul sera utilisé
            produit = str(t.produit or '').strip().upper()
            
            if produit in ["CR DEPART", "CR DÉPART", "CR MED"]:
                print(f"  → Bloc de calcul: CR DEPART")
                print(f"  → Source volume: CR.DEPART.GLOBAL")
                if t.base_calcul == 60 and t.unite_mesure.upper() in ["CAISSON", "CAISSONS"]:
                    print(f"  → Formule: Volume / 500 (cr_par_caisson)")
                elif t.base_calcul == 100:
                    print(f"  → Formule: Volume direct")
            elif produit in ["CO DEPART", "CO DÉPART", "CO MED"]:
                print(f"  → Bloc de calcul: CO DEPART")
                print(f"  → Source volume: CO.DEPART.GLOBAL")
                if t.base_calcul == 100 and t.unite_mesure.upper() in ["SAC", "SACS"]:
                    print(f"  → Formule: Volume / 4500 (courriers_co_par_sac)")
                elif t.base_calcul == 100:
                    print(f"  → Formule: Volume direct")
            
            print()
            
    except Exception as e:
        print(f"Erreur: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_calculations()
