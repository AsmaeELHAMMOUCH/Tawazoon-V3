from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Poste

def revert_poste_type():
    db = SessionLocal()
    try:
        poste_id = 201
        poste = db.query(Poste).filter(Poste.id == poste_id).first()
        if poste:
            print(f"Poste found: {poste.label}, current type: {poste.type_poste}")
            poste.type_poste = None # Revert to None
            db.commit()
            print(f"Reverted poste {poste_id} type to None")
        else:
            print(f"Poste {poste_id} not found")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    revert_poste_type()
