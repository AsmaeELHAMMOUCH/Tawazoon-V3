
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.db import engine, Base
from app.models.db_models import CentreVolumeRef

def init_db():
    print("Creating tables...")
    try:
        # This will create tables that don't exist
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()
