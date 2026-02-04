
import sys
import os
from sqlalchemy import text, inspect

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import get_db, engine

def verify_centres():
    try:
        inspector = inspect(engine)
        
        c_cols = [c['name'] for c in inspector.get_columns('centres', schema='dbo')]
        
        print(f"Centres Columns: {c_cols}")
        print(f"Has 'T_APS': {'T_APS' in c_cols}")
        print(f"Has 'APS': {'APS' in c_cols}")
        print(f"Has 'id_categorisation': {'id_categorisation' in c_cols}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_centres()
