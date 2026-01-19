from sqlalchemy import create_engine, text
import urllib

# Connection string setup
server = r"DESKTOP-7R2C585\SQLEXPRESS"
database = "SimulateurRH_DB_V2"
driver = "ODBC Driver 17 for SQL Server"

params = urllib.parse.quote_plus(
    f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};Trusted_Connection=yes;"
)
DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(DATABASE_URL)

def check_list_centres_query():
    print(f"Connecting to database: {database}...")
    try:
        with engine.connect() as conn:
            # SQL Query from app/api/refs.py
            sql = """
                SELECT
                  c.id,
                  c.T_APS,  -- The column we added
                  c.label,
                  c.region_id,
                  c.categorie_id,
                  c.id_categorisation AS id_categorisation,
                  COALESCE(p.nb_postes, 0)      AS postes,
                  COALESCE(p.type_agg, '')      AS type,
                  COALESCE(f.fte_actuel, 0)     AS fte_actuel
                FROM dbo.centres c
                -- agrÃ©gats postes (nb + type_agg)
                LEFT JOIN (
                  SELECT
                    cp.centre_id,
                    COUNT(*) AS nb_postes,
                    CASE
                      WHEN MIN(p.type_poste) = MAX(p.type_poste) THEN MIN(p.type_poste)
                      ELSE 'MOI/MOD'
                    END AS type_agg
                  FROM dbo.centre_postes cp
                  INNER JOIN dbo.postes p ON p.id = cp.poste_id
                  GROUP BY cp.centre_id
                ) p ON p.centre_id = c.id
                -- somme effectif actuel par centre
                LEFT JOIN (
                  SELECT
                    cp.centre_id,
                    SUM(COALESCE(cp.effectif_actuel, 0)) AS fte_actuel
                  FROM dbo.centre_postes cp
                  GROUP BY cp.centre_id
                ) f ON f.centre_id = c.id
                ORDER BY c.label
            """
            
            print("\n--- Executing list_centres SQL Query ---")
            result = conn.execute(text(sql))
            # Get headers via keys()
            keys = result.keys()
            print(f"Columns returned: {list(keys)}")
            
            # Fetch first row
            row = result.fetchone()
            if row:
                rd = dict(row._mapping) # Convert RowMapping to dict
                print("\n--- First Row Data ---")
                print(rd)
                
                # Check for T_APS specifically
                # Note: SQLAlchemy might return keys as lowercase depending on driver
                aps_keys = [k for k in rd.keys() if 'aps' in k.lower()]
                print(f"\nPotential APS keys: {aps_keys}")
                for k in aps_keys:
                    print(f"  {k}: {rd[k]}")
            else:
                print("No rows returned!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_list_centres_query()
