"""
Script de vérification finale avant test
"""

from sqlalchemy import text
from app.core.db import engine
import json

CENTRE_ID = 8248
TASK_IDS = [4644, 4645, 4646, 4647, 4648]

with engine.connect() as conn:
    # Vérifier les tâches
    ids_str = ','.join(map(str, TASK_IDS))
    result = conn.execute(text(f"""
        SELECT id, moyenne_min, moyenne_sec, flux_id, sens_id, segment_id
        FROM dbo.taches
        WHERE id IN ({ids_str})
    """))
    
    tasks = []
    for r in result:
        duree_min = (r[1] or 0) + (r[2] or 0) / 60.0
        tasks.append({
            "id": r[0],
            "duree_min": round(duree_min, 2),
            "flux_id": r[3],
            "sens_id": r[4],
            "segment_id": r[5]
        })
    
    # Récupérer le nom du centre
    centre_info = conn.execute(text(f"""
        SELECT cp.id, c.label, p.label
        FROM dbo.centre_postes cp
        JOIN dbo.centres c ON c.id = cp.centre_id
        JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.id = {CENTRE_ID}
    """)).first()
    
    summary = {
        "centre_poste_id": CENTRE_ID,
        "centre_nom": str(centre_info[1]) if centre_info else "Unknown",
        "poste_nom": str(centre_info[2]) if centre_info else "Unknown",
        "tasks_configured": tasks,
        "test_instructions": {
            "step_1": f"Sélectionner le centre: {centre_info[1] if centre_info else 'Unknown'}",
            "step_2": "Entrer volume pour: Amana / Arrivée / Particuliers",
            "step_3": "Volume suggéré: 1000 unités annuelles",
            "step_4": "Lancer la simulation",
            "expected": f"{len(tasks)} tâches devraient être calculées"
        }
    }
    
    with open("verification_finale.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(json.dumps(summary, indent=2, ensure_ascii=False))
