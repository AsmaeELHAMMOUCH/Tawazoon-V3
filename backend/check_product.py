import sys
import os
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models.db_models import Tache, CentrePoste

def check_product():
    db = SessionLocal()
    output = []
    try:
        # Chercher la tâche problématique
        task = db.query(Tache).filter(Tache.id == 12677).first()
        
        if task:
            # Récupérer le poste
            cp = db.query(CentrePoste).filter(CentrePoste.id == task.centre_poste_id).first()
            poste_label = cp.poste.label if cp and cp.poste else "Inconnu"
            
            output.append(f"ID: {task.id}")
            output.append(f"Nom: '{task.nom_tache}'")
            output.append(f"CentrePoste ID: {task.centre_poste_id} ({poste_label})")
            output.append(f"Produit RAW: '{task.produit}'")
            output.append(f"Produit UPPER: '{str(task.produit).strip().upper()}'")
            output.append(f"Unité: '{task.unite_mesure}'")
            output.append(f"Base: '{task.base_calcul}'")
            output.append(f"Famille: '{task.famille_uo}'")
            
            # Test de matching
            produit = str(task.produit or '').strip().upper()
            output.append(f"\n=== TESTS DE MATCHING ===")
            output.append(f"Match CR DEPART: {produit in ['CR DEPART', 'CR DÉPART', 'CR MED', 'COURRIER RECOMMANDE DEPART', 'COURRIER RECOMMANDÉ MED']}")
            output.append(f"Match CO DEPART: {produit in ['CO DEPART', 'CO DÉPART', 'CO MED', 'COURRIER ORDINAIRE DEPART', 'COURRIER ORDINAIRE MED']}")
            
        else:
            output.append("Tâche non trouvée")
            
    except Exception as e:
        output.append(f"Erreur: {e}")
        import traceback
        output.append(traceback.format_exc())
    finally:
        db.close()
    
    with open("check_product.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    check_product()
