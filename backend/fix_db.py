
import sys
import os

# Ensure backend dir is in path just in case
sys.path.append(os.getcwd())

from app.core.db import engine
from sqlalchemy import text

def fix():
    with engine.connect() as conn:
        print("Connected.")
        
        # Check and Add 'ordre'
        try:
            print("Checking 'ordre'...")
            conn.execute(text("ALTER TABLE dbo.taches ADD ordre INT NULL;"))
            print("Added 'ordre'.")
        except Exception as e:
            # If column exists, SQL Server throws error 2705
            print(f"Skipping 'ordre' (probably exists): {e}")
            
        # Check and Add 'etat'
        try:
            print("Checking 'etat'...")
            conn.execute(text("ALTER TABLE dbo.taches ADD etat NVARCHAR(50) NULL;"))
            print("Added 'etat'.")
        except Exception as e:
            print(f"Skipping 'etat': {e}")
            
        # Check and Add 'famille_uo'
        try:
            print("Checking 'famille_uo'...")
             # Note: If it exists, error.
            conn.execute(text("ALTER TABLE dbo.taches ADD famille_uo NVARCHAR(255) NULL;"))
            print("Added 'famille_uo'.")
        except Exception as e:
            print(f"Skipping 'famille_uo': {e}")

        # Check and Add 'produit'
        try:
            print("Checking 'produit'...")
            conn.execute(text("ALTER TABLE dbo.taches ADD produit NVARCHAR(255) NULL;"))
            print("Added 'produit'.")
        except Exception as e:
            print(f"Skipping 'produit': {e}")

        # Check and Add 'base_calcul'
        try:
            print("Checking 'base_calcul'...")
            conn.execute(text("ALTER TABLE dbo.taches ADD base_calcul NVARCHAR(50) NULL;"))
            print("Added 'base_calcul'.")
        except Exception as e:
            print(f"Skipping 'base_calcul': {e}")
            
        conn.commit()
        print("Done.")

if __name__ == "__main__":
    fix()
