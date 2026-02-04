import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal
from app.models.db_models import Centre

def check_aps():
    db = SessionLocal()
    try:
        centre = db.query(Centre).filter(Centre.id == 1942).first()
        if centre:
            print(f"Centre: {centre.label} (ID: {centre.id})")
            print(f"APS (mapped to 'APS'): {centre.aps}")
            if hasattr(centre, 't_aps'):
                print(f"T_APS (mapped to 'T_APS'): {centre.t_aps}")
            else:
                print("T_APS attribute not found on model")
        else:
            print("Centre 1942 not found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_aps()
