"""
Script de configuration des données mock pour tester:
Flux Arrivée Amana Particuliers

Ce script va:
1. Vérifier/Créer les données de référence (Flux, Sens, Segments)
2. Identifier un centre de test
3. Créer/Mettre à jour des tâches pour ce centre avec les bons IDs
4. Afficher un résumé pour validation
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from sqlalchemy import text
from app.core.db import engine

# Configuration des IDs cibles
TARGET_FLUX_ID = 1  # AMANA
TARGET_SENS_ID = 1  # ARRIVEE  
TARGET_SEG_ID = 2   # PART (Particuliers)

def main():
    print("="*60)
    print("CONFIGURATION MOCK DATA - Amana / Arrivée / Particuliers")
    print("="*60)
    
    with engine.begin() as conn:
        # ÉTAPE 1: Vérifier les références
        print("\n[1] Vérification des tables de référence...")
        
        flux_count = conn.execute(text("SELECT COUNT(*) FROM dbo.flux")).scalar()
        sens_count = conn.execute(text("SELECT COUNT(*) FROM dbo.volume_sens")).scalar()
        seg_count = conn.execute(text("SELECT COUNT(*) FROM dbo.volume_segments")).scalar()
        
        print(f"   - Flux: {flux_count} entrées")
        print(f"   - Sens: {sens_count} entrées")
        print(f"   - Segments: {seg_count} entrées")
        
        # ÉTAPE 2: Identifier un centre de test
        print("\n[2] Recherche d'un centre de test...")
        
        # Chercher n'importe quel centre
        centre = conn.execute(text("""
            SELECT TOP 1 id, nom 
            FROM dbo.centre_poste 
            ORDER BY id
        """)).mappings().first()
        
        if not centre:
            print("   ERREUR: Aucun centre trouvé!")
            return
            
        centre_id = centre['id']
        centre_nom = centre['nom']
        print(f"   Centre sélectionné: {centre_nom} (ID={centre_id})")
        
        # ÉTAPE 3: Compter les tâches existantes
        print("\n[3] Analyse des tâches existantes...")
        
        total_tasks = conn.execute(text("""
            SELECT COUNT(*) FROM dbo.taches WHERE centre_poste_id = :cp
        """), {"cp": centre_id}).scalar()
        
        print(f"   - Total tâches pour ce centre: {total_tasks}")
        
        if total_tasks == 0:
            print("   ERREUR: Aucune tâche pour ce centre!")
            return
        
        # ÉTAPE 4: Mettre à jour 5 tâches pour notre test
        print(f"\n[4] Configuration de 5 tâches pour Flux={TARGET_FLUX_ID}, Sens={TARGET_SENS_ID}, Seg={TARGET_SEG_ID}...")
        
        # Récupérer les IDs des 5 premières tâches
        task_ids_rows = conn.execute(text("""
            SELECT TOP 5 id FROM dbo.taches 
            WHERE centre_poste_id = :cp
            ORDER BY id
        """), {"cp": centre_id}).mappings().all()
        
        task_ids = [r['id'] for r in task_ids_rows]
        
        if not task_ids:
            print("   ERREUR: Impossible de récupérer les IDs des tâches!")
            return
            
        print(f"   - IDs à mettre à jour: {task_ids}")
        
        # Mise à jour
        ids_str = ','.join(map(str, task_ids))
        conn.execute(text(f"""
            UPDATE dbo.taches
            SET flux_id = {TARGET_FLUX_ID}, 
                sens_id = {TARGET_SENS_ID}, 
                segment_id = {TARGET_SEG_ID}
            WHERE id IN ({ids_str})
        """))
        
        print("   - Mise à jour effectuée!")
        
        # ÉTAPE 5: Vérification
        print("\n[5] Vérification des tâches configurées...")
        
        verified = conn.execute(text(f"""
            SELECT id, libelle, moyenne_min, moyenne_sec, flux_id, sens_id, segment_id
            FROM dbo.taches
            WHERE id IN ({ids_str})
        """)).mappings().all()
        
        print(f"\n   Tâches configurées ({len(verified)}):")
        for t in verified:
            duree = (t['moyenne_min'] or 0) + (t['moyenne_sec'] or 0) / 60.0
            print(f"   - ID {t['id']}: {t['libelle'][:40]}")
            print(f"     Durée: {duree:.2f} min | F={t['flux_id']} S={t['sens_id']} SG={t['segment_id']}")
        
        # ÉTAPE 6: Résumé pour le test
        print("\n" + "="*60)
        print("RÉSUMÉ - Données prêtes pour le test")
        print("="*60)
        print(f"\nCentre de test: {centre_nom} (ID={centre_id})")
        print(f"Combinaison configurée: Flux={TARGET_FLUX_ID} / Sens={TARGET_SENS_ID} / Segment={TARGET_SEG_ID}")
        print(f"Nombre de tâches: {len(verified)}")
        print("\nPour tester dans le frontend:")
        print(f"1. Sélectionner le centre: {centre_nom}")
        print(f"2. Entrer un volume pour: Amana / Arrivée / Particuliers")
        print(f"3. Exemple: 1000 unités annuelles")
        print(f"4. Lancer la simulation")
        print("\nLes heures devraient être calculées!")
        print("="*60)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERREUR: {e}")
        import traceback
        traceback.print_exc()
