
import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db, engine

def verify_postes():
    try:
        print("\n--- Testing FIXED refs.py SQL Query (centre_id=1965) ---")
        # This is the updated query using p.type
        sql = """
            SELECT 
                p.id,
                cp.id AS centre_poste_id,
                p.label,
                p.type AS type_poste, 
                COALESCE(cp.effectif_actuel, 0) AS effectif_actuel
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            WHERE cp.centre_id = 1965
            ORDER BY p.label
        """
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = result.fetchall()
            print(f"Query returned {len(rows)} rows.")
            if len(rows) > 0:
                print(f"First row: {rows[0]}")
            else:
                print("No rows found.")

        print("\n--- Testing FIXED list_centres SQL Query (centre_id=1965) ---")
        sql_centres = """
            SELECT
              c.id,
              CAST(c.T_APS AS FLOAT) AS t_aps_global,
              CAST(c.APS AS FLOAT) AS aps_legacy,
              c.label,
              c.region_id,
              c.categorie_id,
              c.id_categorisation AS id_categorisation,
              COALESCE(p.nb_postes, 0)      AS postes,
              COALESCE(p.type_agg, '')      AS type,
              COALESCE(f.fte_actuel, 0)     AS fte_actuel
            FROM dbo.centres c
            LEFT JOIN (
              SELECT
                cp.centre_id,
                COUNT(*) AS nb_postes,
                CASE
                  WHEN MIN(p.type) = MAX(p.type) THEN MIN(p.type)
                  ELSE 'MOI/MOD'
                END AS type_agg
              FROM dbo.centre_postes cp
              INNER JOIN dbo.postes p ON p.id = cp.poste_id
              GROUP BY cp.centre_id
            ) p ON p.centre_id = c.id
            LEFT JOIN (
              SELECT
                cp.centre_id,
                SUM(COALESCE(cp.effectif_actuel, 0)) AS fte_actuel
              FROM dbo.centre_postes cp
              GROUP BY cp.centre_id
            ) f ON f.centre_id = c.id
            WHERE c.id = 1965
        """
        with engine.connect() as conn:
            result = conn.execute(text(sql_centres))
            rows = result.fetchall()
            print(f"Query returned {len(rows)} rows.")
            if len(rows) > 0:
                print(f"First row: {rows[0]}")
            else:
                print("No rows found.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_postes()
