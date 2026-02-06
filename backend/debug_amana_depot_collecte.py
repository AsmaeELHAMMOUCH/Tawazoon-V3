"""
Script de débogage pour analyser les tâches avec produit='AMANA Dépôt' et famille_uo='Collecte'
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Tache

# Configuration de la base de données
DATABASE_URL = "sqlite:///./simulateur_rh.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def main():
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("ANALYSE DES TÂCHES: produit='AMANA Dépôt' ET famille_uo='Collecte'")
        print("=" * 80)
        
        # Recherche des tâches avec ces critères
        taches = db.query(Tache).filter(
            Tache.produit.ilike("%AMANA%"),
            Tache.produit.ilike("%D_P_T%")
        ).all()
        
        print(f"\n📊 Total tâches trouvées avec 'AMANA' et 'DÉPÔT' dans produit: {len(taches)}\n")
        
        collecte_tasks = []
        
        for t in taches:
            produit_raw = str(getattr(t, 'produit', '') or '').strip()
            produit_norm = produit_raw.upper()
            famille_raw = str(getattr(t, 'famille_uo', '') or '').strip()
            famille_norm = famille_raw.upper()
            
            # Afficher toutes les tâches AMANA DÉPÔT
            print(f"\n{'='*80}")
            print(f"ID Tâche: {t.id}")
            print(f"Nom: {t.nom_tache}")
            print(f"Produit (RAW): '{produit_raw}'")
            print(f"Produit (NORM): '{produit_norm}'")
            print(f"Famille UO (RAW): '{famille_raw}'")
            print(f"Famille UO (NORM): '{famille_norm}'")
            print(f"Unité Mesure: {t.unite_mesure}")
            print(f"Base Calcul: {t.base_calcul}")
            print(f"Moyenne Minute: {t.moyenne_minute}")
            
            # Vérifier si c'est une tâche Collecte
            if "COLLECTE" in famille_norm:
                collecte_tasks.append(t)
                print(f"✅ TÂCHE COLLECTE DÉTECTÉE!")
                
                # Vérifier les conditions du code
                print(f"\n🔍 Analyse des conditions du code:")
                print(f"   - 'COLLECTE COLIS' in nom_tache.upper(): {'COLLECTE COLIS' in t.nom_tache.upper()}")
                print(f"   - 'COLLECTE' in famille: {'COLLECTE' in famille_norm}")
                
                # Vérifier quelle branche serait prise
                if "COLLECTE COLIS" in t.nom_tache.upper():
                    print(f"   ➡️ Branche: COLLECTE COLIS (ligne 422)")
                elif "COLLECTE" in famille_norm:
                    print(f"   ➡️ Branche: Autres tâches Famille COLLECTE (ligne 467)")
                else:
                    print(f"   ⚠️ AUCUNE BRANCHE NE CORRESPOND!")
            else:
                print(f"❌ Pas une tâche COLLECTE")
        
        print(f"\n{'='*80}")
        print(f"📊 RÉSUMÉ:")
        print(f"   Total tâches AMANA DÉPÔT: {len(taches)}")
        print(f"   Tâches COLLECTE: {len(collecte_tasks)}")
        print(f"{'='*80}")
        
        if collecte_tasks:
            print(f"\n📋 LISTE DES TÂCHES COLLECTE:")
            for t in collecte_tasks:
                print(f"   - ID {t.id}: {t.nom_tache} (Base: {t.base_calcul}, Unité: {t.unite_mesure})")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
