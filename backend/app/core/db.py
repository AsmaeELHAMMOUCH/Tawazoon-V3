 # Configuration de la base de données
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from typing import Generator
import urllib

from app.core.config import settings

# Encoder l'URL pour pyodbc
params = urllib.parse.quote_plus(settings.DATABASE_URL)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

# Créer le moteur
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
    echo=True,  # Active les logs SQL
    connect_args={"timeout": 30, "autocommit": True}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
class Base(DeclarativeBase):
    pass

# Dependency pour obtenir la session DB
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()