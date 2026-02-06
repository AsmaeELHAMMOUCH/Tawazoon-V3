from app.core.db import SessionLocal
from sqlalchemy import text

def list_cndp_tasks():
    db = SessionLocal()
    try:
        # ID 1965 is CNDP based on previous context "Centre National de Dépôt..."
        sql = """
            SELECT t.nom_tache, t.unite_mesure 
            FROM dbo.taches t 
            JOIN dbo.centre_postes cp ON t.centre_poste_id = cp.id 
            WHERE cp.centre_id = 1965 
            ORDER BY t.nom_tache
        """
        results = db.execute(text(sql)).mappings().all()
        print(f"Found {len(results)} tasks for CNDP (ID 1965):")
        for r in results:
            print(f" - {r['nom_tache']} ({r['unite_mesure']})")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_cndp_tasks()
