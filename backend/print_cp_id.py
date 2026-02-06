
import sys
import os
sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache

def get_cp_id():
    db = SessionLocal()
    t = db.query(Tache).filter(Tache.id == 12677).first()
    print(f"CP_ID={t.centre_poste_id}")
    db.close()

if __name__ == "__main__":
    get_cp_id()
