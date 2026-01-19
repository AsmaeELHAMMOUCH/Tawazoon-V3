"""
Script simplifié pour configurer les données mock
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import text
from app.core.db import engine

def setup():
    with engine.begin() as conn:
        print("Configuration des données mock...")
        
        # 1. Trouver un centre
        print("\n1. Recherche d'un centre...")
        result = conn.execute(text("SELECT TOP 1 id, nom FROM dbo.centre_poste"))
        row = result.first()
        
        if not row:
            print("Aucun centre trouve!")
            return
            
        centre_id, centre_nom = row[0], row[1]
        print(f"   Centre: {centre_nom} (ID={centre_id})")
        
        # 2. Trouver des tâches pour ce centre
        print("\n2. Recherche de taches...")
        result = conn.execute(text(f"SELECT TOP 5 id FROM dbo.taches WHERE centre_poste_id = {centre_id}"))
        task_rows = result.fetchall()
        
        if not task_rows:
            print("Aucune tache trouvee!")
            return
            
        task_ids = [r[0] for r in task_rows]
        print(f"   Taches trouvees: {task_ids}")
        
        # 3. Mettre à jour ces tâches
        print("\n3. Mise a jour...")
        ids_str = ','.join(map(str, task_ids))
        
        conn.execute(text(f"""
            UPDATE dbo.taches
            SET flux_id = 1, sens_id = 1, segment_id = 2
            WHERE id IN ({ids_str})
        """))
        
        print("   Mise a jour OK!")
        
        # 4. Vérifier
        print("\n4. Verification...")
        result = conn.execute(text(f"""
            SELECT id, libelle, flux_id, sens_id, segment_id
            FROM dbo.taches
            WHERE id IN ({ids_str})
        """))
        
        for row in result:
            print(f"   - ID {row[0]}: F={row[2]} S={row[3]} SG={row[4]}")
        
        print("\n" + "="*60)
        print(f"PRET POUR LE TEST!")
        print(f"Centre: {centre_nom} (ID={centre_id})")
        print(f"Flux=1 (Amana) / Sens=1 (Arrivee) / Segment=2 (Part)")
        print(f"Taches configurees: {len(task_ids)}")
        print("="*60)

if __name__ == "__main__":
    try:
        setup()
    except Exception as e:
        print(f"ERREUR: {e}")
        import traceback
        traceback.print_exc()
