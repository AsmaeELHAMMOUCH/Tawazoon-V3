from sqlalchemy import text
from app.core.db import engine
import json

with engine.connect() as conn:
    # Compter les centres
    cp_count = conn.execute(text("SELECT COUNT(*) FROM dbo.centre_postes")).scalar()
    
    # Compter les tâches
    task_count = conn.execute(text("SELECT COUNT(*) FROM dbo.taches")).scalar()
    
    # Compter les tâches par centre
    result = conn.execute(text("""
        SELECT centre_poste_id, COUNT(*) as count
        FROM dbo.taches
        GROUP BY centre_poste_id
        ORDER BY count DESC
    """))
    
    tasks_by_centre = [{"centre_id": r[0], "count": r[1]} for r in result.fetchall()]
    
    data = {
        "centre_postes_count": cp_count,
        "total_tasks": task_count,
        "tasks_by_centre": tasks_by_centre[:10]  # Top 10
    }
    
    with open("db_stats.json", "w") as f:
        json.dump(data, f, indent=2)
    
    print(json.dumps(data, indent=2))
