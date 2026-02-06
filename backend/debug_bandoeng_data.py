from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Adjust path to find app module
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from app.core.config import settings

# Manual connection string if settings fail, assuming local dev convention or getting from settings
import urllib.parse
params = urllib.parse.quote_plus(settings.DATABASE_URL)
DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_data():
    db = SessionLocal()
    try:
        print("--- DEBUGGING DATA ---")
        
        # 1. Check Poste 'GUICHETIER'
        print("\n[CHECK 1] Recherche du Poste 'GUICHETIER'")
        # Search exact and like
        sql = text("SELECT id, label, Code FROM postes WHERE label LIKE '%GUICHETIER%'")
        result = db.execute(sql).fetchall()
        if result:
            for r in result:
                print(f"FOUND: ID={r[0]}, Label='{r[1]}', Code='{r[2]}'")
        else:
            print("NOT FOUND: Aucun poste contenant 'GUICHETIER'")

        # 2. Check Task 'Chant et Pointage'
        print("\n[CHECK 2] Recherche de la Tâche 'Chant et Pointage'")
        sql = text("SELECT id, nom_tache, famille_uo, produit, unite_mesure FROM taches WHERE nom_tache LIKE '%Chant%'")
        result = db.execute(sql).fetchall()
        if result:
             for r in result:
                print(f"FOUND: ID={r[0]}, Nom='{r[1]}', Famille='{r[2]}', Produit='{r[3]}', Unite='{r[4]}'")
        else:
             print("NOT FOUND: Aucune tâche commençant par 'Chant'")
             
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure env vars are loaded if needed, but simple SQL check usually fine
    debug_data()
