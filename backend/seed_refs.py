import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def seed_refs():
    with engine.begin() as conn:
        print("Seeding References...")
        
        # SENS
        print("Seeding VolumeSens...")
        conn.execute(text("SET IDENTITY_INSERT dbo.volume_sens ON"))
        sens_data = [
            (1, 'ARRIVEE', 'Arrivée'),
            (2, 'DEPOT', 'Dépôt'),
            (3, 'RECUP', 'Récupération'),
            (4, 'DEPART', 'Départ')
        ]
        for sid, code, lib in sens_data:
            exists = conn.execute(text("SELECT 1 FROM dbo.volume_sens WHERE id=:id"), {"id": sid}).scalar()
            if not exists:
                conn.execute(text("INSERT INTO dbo.volume_sens (id, code, libelle) VALUES (:id, :code, :lib)"), {"id": sid, "code": code, "lib": lib})
                print(f"Inserted Sens {code}")
        conn.execute(text("SET IDENTITY_INSERT dbo.volume_sens OFF"))

        # SEGMENTS
        print("Seeding VolumeSegments...")
        conn.execute(text("SET IDENTITY_INSERT dbo.volume_segments ON"))
        seg_data = [
            (1, 'GLOBAL', 'Global'),
            (2, 'PART', 'Particuliers'),
            (3, 'PRO', 'Professionnels'),
            (4, 'DIST', 'Distribution'),
            (5, 'AXES', 'Axes')
        ]
        for sid, code, lib in seg_data:
            exists = conn.execute(text("SELECT 1 FROM dbo.volume_segments WHERE id=:id"), {"id": sid}).scalar()
            if not exists:
                conn.execute(text("INSERT INTO dbo.volume_segments (id, code, libelle) VALUES (:id, :code, :lib)"), {"id": sid, "code": code, "lib": lib})
                print(f"Inserted Segment {code}")
        conn.execute(text("SET IDENTITY_INSERT dbo.volume_segments OFF"))
        
        print("Done.")

if __name__ == "__main__":
    seed_refs()
