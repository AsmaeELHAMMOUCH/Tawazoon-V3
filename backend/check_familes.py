from app.core.db import SessionLocal
from app.models.db_models import Tache
from sqlalchemy import distinct

db = SessionLocal()
familles = db.query(distinct(Tache.famille_uo)).all()
print("Familles distinctes :")
for f in familles:
    print(f" - '{f[0]}'")
db.close()
