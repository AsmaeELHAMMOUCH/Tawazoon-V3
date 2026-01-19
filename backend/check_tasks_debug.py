
import sys
import os

# Add backend directory to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.db_models import Tache

# Setup DB connection
# Note: Using urllib for connection string formatting if needed, but here we construct raw string
# as in config.py. However, SQLAlchemy usually needs a URL string for create_engine.
# The config.py returns an ODBC connection string for pyodbc, but create_engine needs a
# sqlalchemy URL like "mssql+pyodbc:///?odbc_connect=..."

driver = settings.DB_DRIVER.replace(" ", "+")
try:
    from urllib.parse import quote_plus
    conn_str = settings.DATABASE_URL
    # We need to construct a SQLAlchemy URL
    # db_url = f"mssql+pyodbc:///?odbc_connect={quote_plus(conn_str)}"
    # Wait, the settings.DATABASE_URL is a method returning a raw string. 
    # Let's import the session setup from app.core.db if possible.
    from app.core.db import SessionLocal
except Exception as e:
    print(f"Error importing SessionLocal: {e}")
    # Fallback to manual creation if app.core.db is not straightforward
    from sqlalchemy.engine import URL
    connection_url = URL.create(
        "mssql+pyodbc", 
        query={"odbc_connect": settings.DATABASE_URL}
    )
    engine = create_engine(connection_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_tasks():
    db = SessionLocal()
    try:
        print("Searching for tasks...")
        tasks = db.query(Tache).filter(
            (Tache.nom_tache.ilike("%Comptage Colis%")) | 
            (Tache.nom_tache.ilike("%Rapprochement%"))
        ).all()
        
        print(f"Found {len(tasks)} tasks:")
        for t in tasks:
            print(f"ID={t.id_tache} NOM='{t.nom_tache}' PROD='{t.produit}' FAMILLE='{t.famille_uo}' UNIT='{t.unite_mesure}' BASE='{t.base_calcul}'")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_tasks()
