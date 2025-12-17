import sys
import os

# Ajout du root au path pour les imports
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.schemas.direction_sim import DirectionSimRequest, CentreVolume
from app.services.direction_service import process_direction_simulation
import traceback

def test_crash():
    db = SessionLocal()
    try:
        # Find valid direction
        from sqlalchemy import text
        row = db.execute(text("SELECT TOP 1 id FROM dbo.directions")).mappings().first()
        if not row:
            print("Aucune direction trouvée en base.")
            return
        
        dir_id = row["id"]
        print(f"✅ Direction trouvée: {dir_id}")

        # Payload qui mime celui du frontend
        payload = DirectionSimRequest(
            direction_id=dir_id,
            mode="actuel",
            global_params={
                "productivite": 100,
                "heures_par_jour": 7.5,
                "idle_minutes": 0
            },
            volumes=[
                CentreVolume(
                    centre_label="Test Centre", # Will likely be unmatched/unknown, leading to 'only params' sim, but shouldn't crash
                    sacs=100,
                    colis=50,
                    colis_amana_par_sac=None,
                    courriers_par_sac=None
                )
            ]
        )
        
        print("🚀 Lancement simulation...")
        res = process_direction_simulation(db, payload)
        print("✅ Succès !")
        print(res.kpis)
    except Exception:
        print("💥 CRASH !")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_crash()
