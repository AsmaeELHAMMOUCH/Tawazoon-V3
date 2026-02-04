from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Poste

def update_poste_type():
    db = SessionLocal()
    try:
        poste_id = 201
        poste = db.query(Poste).filter(Poste.id == poste_id).first()
        if poste:
            print(f"Poste found: {poste.label}, current type: {poste.type_poste}")
            poste.type_poste = 'MOD'
            db.commit()
            print(f"Updated poste {poste_id} type to 'MOD'")
        else:
            print(f"Poste {poste_id} not found")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_poste_type()
