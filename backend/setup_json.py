"""
Script de configuration - sortie vers fichier
"""

from sqlalchemy import text
from app.core.db import engine
import json

def setup():
    results = {
        "success": False,
        "centre_id": None,
        "centre_nom": None,
        "task_ids": [],
        "error": None
    }
    
    try:
        with engine.begin() as conn:
            # 1. Trouver un centre qui a des tâches
            result = conn.execute(text("""
                SELECT TOP 1 t.centre_poste_id, COUNT(*) as task_count
                FROM dbo.taches t
                GROUP BY t.centre_poste_id
                HAVING COUNT(*) > 5
                ORDER BY COUNT(*) DESC
            """))
            row = result.first()
            
            if not row:
                results["error"] = "Aucun centre avec taches trouve"
                return results
                
            results["centre_id"] = row[0]
            results["centre_nom"] = f"CentrePoste_{row[0]}"
            
            # 2. Trouver des tâches
            centre_id = results["centre_id"]
            result = conn.execute(text(f"SELECT TOP 5 id FROM dbo.taches WHERE centre_poste_id = {centre_id}"))
            task_rows = result.fetchall()
            
            if not task_rows:
                results["error"] = "Aucune tache trouvee"
                return results
                
            task_ids = [r[0] for r in task_rows]
            results["task_ids"] = task_ids
            
            # 3. Mettre à jour
            ids_str = ','.join(map(str, task_ids))
            
            conn.execute(text(f"""
                UPDATE dbo.taches
                SET flux_id = 1, sens_id = 1, segment_id = 2
                WHERE id IN ({ids_str})
            """))
            
            results["success"] = True
            
    except Exception as e:
        results["error"] = str(e)
    
    return results

if __name__ == "__main__":
    results = setup()
    
    # Écrire dans un fichier JSON
    with open("setup_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Afficher aussi
    print(json.dumps(results, indent=2, ensure_ascii=False))
