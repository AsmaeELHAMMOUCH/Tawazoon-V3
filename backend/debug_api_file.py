import json
from app.core.db import SessionLocal
from sqlalchemy import text

def check_queries():
    db = SessionLocal()
    results = {}
    try:
        # 1. Centre
        sql_centre = "SELECT id, label, region_id, id_categorisation FROM dbo.centres WHERE label LIKE :term"
        rows = db.execute(text(sql_centre), {"term": "%VALFLEURI%"}).fetchall()
        results['centres'] = [dict(r._mapping) for r in rows]

        # 2. Categorisation
        sql_cat = "SELECT id_categorisation as id, label FROM dbo.Categorisation"
        rows_cat = db.execute(text(sql_cat)).fetchall()
        results['categorisations'] = [dict(r._mapping) for r in rows_cat]
            
    except Exception as e:
        results['error'] = str(e)
    finally:
        db.close()
    
    with open("debug_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

if __name__ == "__main__":
    check_queries()
