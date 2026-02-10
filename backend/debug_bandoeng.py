
import os
import sys

# Ajouter le chemin de l'application
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models.db_models import Tache, CentrePoste, Poste, Centre
from sqlalchemy.orm import Session

def debug_simulation(centre_id: int):
    db = SessionLocal()
    try:
        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            print(f"❌ Centre {centre_id} non trouvé")
            return

        print(f"📊 Analyse pour le centre: {centre.nom} (ID: {centre_id})")
        
        # 1. Vérifier les CentrePostes
        cps = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
        print(f"✅ Nombre de CentrePoste trouvés: {len(cps)}")
        
        for cp in cps:
            # Vérifier la jointure avec Poste
            poste = db.query(Poste).filter(Poste.Code == cp.code_resp).first()
            if poste:
                print(f"   - CP ID: {cp.id}, CodeResp: {cp.code_resp} -> Poste: {poste.label} (Type: {poste.type_poste})")
            else:
                # Essayer par l'ID si le code ne marche pas
                poste_by_id = db.query(Poste).filter(Poste.id == cp.poste_id).first()
                print(f"   - CP ID: {cp.id}, CodeResp: {cp.code_resp} -> ❌ Poste NON TROUVÉ par CODE. (Par ID: {poste_by_id.label if poste_by_id else 'Néant'})")

        # 2. Vérifier les Tâches avec le filtre MOD
        query = (
            db.query(Tache)
            .join(CentrePoste)
            .join(Poste, CentrePoste.code_resp == Poste.Code)
            .filter(CentrePoste.centre_id == centre_id)
            .filter(Poste.type_poste == 'MOD')
        )
        taches_mod = query.all()
        print(f"✅ Nombre de tâches MOD trouvées: {len(taches_mod)}")
        
        if taches_mod:
            print("\n🔍 Échantillon de tâches (Produit | Unité):")
            for t in taches_mod[:10]:
                print(f"   - {t.nom_tache[:30]} | {t.produit} | {t.unite_mesure}")

        # 3. Vérifier les produits distincts
        produits = db.query(Tache.produit).distinct().all()
        print(f"\n🏷️ Top 20 produits en DB:")
        for p in produits[:20]:
            print(f"   - '{p[0]}'")

    finally:
        db.close()

if __name__ == "__main__":
    # Tester avec un ID courant (Celui mentionné dans Simulation.jsx ou un ID connu)
    # L'utilisateur a mentionné ID 1942 dans Simulation.jsx comments
    debug_simulation(1942)
