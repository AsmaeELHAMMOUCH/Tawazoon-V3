from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

# Setup DB connection
DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

centre_id = 1913
print(f"Inspecting tasks for Centre ID: {centre_id}")

# Fetch CentrePostes
sql_cp = text("SELECT id, poste_id FROM centre_postes WHERE centre_id = :cid")
cps = db.execute(sql_cp, {"cid": centre_id}).fetchall()
cp_ids = [r[0] for r in cps]
print(f"Centre Postes: {cp_ids}")

if cp_ids:
    # Fetch Tasks
    sql_taches = text(f"SELECT id, nom_tache, famille_uo FROM taches WHERE centre_poste_id IN ({','.join(map(str, cp_ids))})")
    taches = db.execute(sql_taches).fetchall()
    
    print(f"Found {len(taches)} tasks. First 20:")
    for t in taches[:20]:
        print(f" - ID: {t[0]}, Nom: '{t[1]}', Famille: '{t[2]}'")
else:
    print("No Centre Postes found.")
