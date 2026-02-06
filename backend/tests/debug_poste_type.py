from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Poste

def check_poste_type():
    db = SessionLocal()
    try:
        poste_id = 201
        poste = db.query(Poste).filter(Poste.id == poste_id).first()
        if poste:
            print(f"Poste ID: {poste.id}")
            print(f"Label: {poste.label}")
            print(f"Type: {poste.type_poste}")
            print(f"Code: {poste.Code}")
        else:
            print(f"Poste {poste_id} not found")
    finally:
        db.close()

if __name__ == "__main__":
    check_poste_type()
