# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


préparé une page d’accueil complète, responsive et assortie au style de ton app (dégradés bleu/cyan, glassmorphism, stats, aperçus, CTA). Tu peux la prévisualiser et l’éditer ici, dans le canvas.

Pour l’intégrer vite dans ton projet :

Crée une route (ex. /) et colle ce composant comme page Accueil.tsx/Accueil.jsx.

Assure-toi que Tailwind + Framer Motion + lucide-react sont installés.

Les liens “Ouvrir l’app” pointent vers /app — adapte selon ton routing.

Remplace les “ChartMock” par tes vrais graphiques (ECharts/Charts.js) quand tu veux.

Tu veux que j’ajoute une section “clients”, un bloc “témoignages”, ou un mode sombre auto ?



### 🔄 Ordre d'Exécution ``` Requête HTTP arrive ⬇️ 1️⃣ get_db() démarre → Ouvre connexion 2️⃣ yield db → Donne connexion à la route 3️⃣ Route s'exécute → Utilise la connexion 4️⃣ Route retourne → Termine son travail 5️⃣ get_db() reprend → Après yield 6️⃣ finally s'exécute → Ferme connexion Réponse HTTP envoyée ⬆️

•  yield = "Pause et donne une valeur, puis reprends plus tard" 
•  finally = "Exécute ce code TOUJOURS, même si erreur" 
•  FastAPI + Depends() = Gère automatiquement le cycle de vie

Schémas Pydantic (Validation des Données)

3.4 Créer les Tables

user.Base.metadata.create_all(bind=engine)



________________________________________
🔧 BONUS: Spécificités SQL Server
Types de Données SQL Server vs SQLAlchemy
Python/SQLAlchemy	SQL Server	Notes
String(255)	NVARCHAR(255)	Unicode par défaut
Text	NVARCHAR(MAX)	Texte illimité
Integer	INT	Entier standard
BigInteger	BIGINT	Grand entier
Boolean	BIT	0 ou 1
DateTime	DATETIME2	Précision élevée
Float	FLOAT	Nombre décimal
Numeric(10,2)	DECIMAL(10,2)	Montant financier
Optimisations SQL Server
app/models/optimized_user.py (Exemple avancé)
from sqlalchemy import Boolean, Column, Integer, String, DateTime, Index
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
import uuid
from app.database import Base

class OptimizedUser(Base):
    __tablename__ = "optimized_users"
    
    # Option 1: IDENTITY (auto-increment classique)
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Option 2: UNIQUEIDENTIFIER (UUID) - recommandé pour distribution
    # guid = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Colonnes auditées
    created_at = Column(DateTime, server_default=func.getdate(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.getdate())
    created_by = Column(String(100))
    
    # Index composé pour recherches fréquentes
    __table_args__ = (
        Index('idx_user_active_email', 'is_active', 'email'),
        Index('idx_user_username', 'username'),
    )
Requêtes Optimisées SQL Server
app/repositories/user_repository.py (Pattern Repository)
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_
from app.models.user import User
from typing import List, Optional

class UserRepository:
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Récupérer un utilisateur par ID avec cache"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Récupérer par email (index optimisé)"""
        return self.db.query(User).filter(User.email == email).first()
    
    def search_users(
        self, 
        search_term: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[User]:
        """Recherche avec LIKE optimisé"""
        search = f"%{search_term}%"
        return (
            self.db.query(User)
            .filter(
                or_(
                    User.username.like(search),
                    User.email.like(search)
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def bulk_create(self, users_data: List[dict]) -> List[User]:
        """Insertion en masse (plus rapide)"""
        users = [User(**data) for data in users_data]
        self.db.bulk_save_objects(users)
        self.db.commit()
        return users
Transactions et Gestion d'Erreurs
app/utils/transaction.py
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

@contextmanager
def transaction_scope(db: Session):
    """Context manager pour les transactions"""
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Erreur transaction: {e}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur inattendue: {e}")
        raise

# Utilisation:
# with transaction_scope(db) as session:
#     session.add(user)
#     session.add(post)
Procédures Stockées SQL Server
scripts/stored_procedures.sql
-- Créer une procédure stockée pour des opérations complexes
CREATE PROCEDURE sp_GetActiveUsersCount
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT COUNT(*) as total_users
    FROM users
    WHERE is_active = 1;
END
GO

-- Appeler depuis Python
app/utils/stored_procedures.py
from sqlalchemy import text
from sqlalchemy.orm import Session

def call_stored_procedure(db: Session, proc_name: str, **params):
    """Appeler une procédure stockée"""
    # Construction de la requête
    param_str = ", ".join([f"@{k}=:{k}" for k in params.keys()])
    query = text(f"EXEC {proc_name} {param_str}")
    
    # Exécution
    result = db.execute(query, params)
    return result.fetchall()

# Utilisation:
# results = call_stored_procedure(db, "sp_GetActiveUsersCount")
Performance et Monitoring SQL Server
app/utils/performance.py
from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
import logging

logger = logging.getLogger(__name__)

# Logger les requêtes lentes
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Logger si la requête prend plus de 1 seconde
    if total > 1.0:
        logger.warning(f"Requête lente ({total:.2f}s): {statement[:100]}...")
Backup et Restore SQL Server
scripts/backup_database.py
import pyodbc
from datetime import datetime
from app.config import settings

def backup_database():
    """Créer un backup de la base de données"""
    conn_str = (
        f"DRIVER={{{settings.SQL_SERVER_DRIVER}}};"
        f"SERVER={settings.SQL_SERVER_HOST};"
        f"DATABASE=master;"
        f"UID={settings.SQL_SERVER_USER};"
        f"PWD={settings.SQL_SERVER_PASSWORD};"
    )
    
    backup_file = f"backup_{settings.SQL_SERVER_DB}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
    
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    query = f"""
    BACKUP DATABASE [{settings.SQL_SERVER_DB}]
    TO DISK = N'/var/opt/mssql/backup/{backup_file}'
    WITH FORMAT, INIT, NAME = N'Full Database Backup';
    """
    
    cursor.execute(query)
    conn.commit()
    print(f"✅ Backup créé: {backup_file}")
    conn.close()

if __name__ == "__main__":
    backup_database()
________________________________________
# Formation Complète FastAPI - De Débutant à Production
📚 Table des Matières
1.	Introduction et Prérequis
2.	Fondamentaux FastAPI
3.	Base de Données avec SQLAlchemy
4.	Authentification et Sécurité
5.	Tests et Validation
6.	Déploiement avec Docker
7.	Déploiement Cloud
8.	Bonnes Pratiques Production
________________________________________
Partie 1: Introduction et Prérequis
Installation de l'environnement
# Installer Python 3.10+ (vérifier la version)
python --version

# Créer un dossier pour le projet
mkdir mon-api-fastapi
cd mon-api-fastapi

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows:
venv\Scripts\activate
# Sur Mac/Linux:
source venv/bin/activate

# Installer les dépendances de base (avec pyodbc pour SQL Server)
pip install fastapi uvicorn[standard] sqlalchemy pyodbc python-jose[cryptography] passlib[bcrypt] python-multipart
Installation du Driver SQL Server
Sur Windows: Le driver ODBC est généralement déjà installé. Vérifiez avec:
# Liste des drivers disponibles
python -c "import pyodbc; print(pyodbc.drivers())"
Sur Linux:
# Ubuntu/Debian
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/mssql-release.list
sudo apt-get update
sudo ACCEPT_EULA=Y apt-get install -y msodbcsql18
sudo apt-get install -y unixodbc-dev
Sur Mac:
brew install unixodbc
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew install msodbcsql18
Structure du projet
mon-api-fastapi/
│
├── app/
│   ├── __init__.py
│   ├── main.py              # Point d'entrée de l'application
│   ├── config.py            # Configuration
│   ├── database.py          # Connexion base de données
│   │
│   ├── models/              # Modèles SQLAlchemy
│   │   ├── __init__.py
│   │   └── user.py
│   │
│   ├── schemas/             # Schémas Pydantic
│   │   ├── __init__.py
│   │   └── user.py
│   │
│   ├── routers/             # Routes API
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   └── users.py
│   │
│   └── utils/               # Utilitaires
│       ├── __init__.py
│       ├── security.py
│       └── dependencies.py
│
├── tests/                   # Tests
├── alembic/                 # Migrations base de données
├── .env                     # Variables d'environnement
├── .gitignore
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
________________________________________
Partie 2: Fondamentaux FastAPI
2.1 Première API Simple
app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Mon API",
    description="API de démonstration FastAPI",
    version="1.0.0"
)

# Configuration CORS (pour permettre les requêtes front-end)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur mon API FastAPI!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
Lancer l'application:
uvicorn app.main:app --reload
Visitez: http://127.0.0.1:8000/docs (documentation interactive automatique!)
2.2 Routes avec Paramètres
from typing import Optional
from fastapi import FastAPI, Query, Path
from pydantic import BaseModel

# Modèle de données
class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

@app.get("/items/{item_id}")
def read_item(
    item_id: int = Path(..., title="L'ID de l'item", ge=1),
    q: Optional[str] = Query(None, max_length=50)
):
    return {"item_id": item_id, "q": q}

@app.post("/items/")
def create_item(item: Item):
    return {"item": item, "total": item.price + (item.tax or 0)}
________________________________________
Partie 3: Base de Données avec SQLAlchemy
3.0 Configuration SQL Server (Spécifique)
Option 1: SQL Server Local (Windows)
Installation:
1.	Téléchargez SQL Server Express (gratuit): https://www.microsoft.com/sql-server/sql-server-downloads
2.	Installez SQL Server Management Studio (SSMS)
3.	Activez l'authentification mixte (SQL Server et Windows)
Configuration:
-- Dans SSMS, créer un nouvel utilisateur
USE master;
GO

CREATE LOGIN fastapi_user WITH PASSWORD = 'YourStrong@Password123';
GO

CREATE DATABASE fastapi_db;
GO

USE fastapi_db;
GO

CREATE USER fastapi_user FOR LOGIN fastapi_user;
GO

ALTER ROLE db_owner ADD MEMBER fastapi_user;
GO
Option 2: SQL Server via Docker (Multi-plateforme)
# Démarrer SQL Server en conteneur
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong@Passw0rd" \
   -p 1433:1433 --name sqlserver \
   -d mcr.microsoft.com/mssql/server:2022-latest

# Se connecter avec sqlcmd
docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd \
   -S localhost -U sa -P "YourStrong@Passw0rd"
Option 3: Azure SQL Database (Cloud)
# Connection string pour Azure SQL
DATABASE_URL = (
    "mssql+pyodbc://username@servername:password"
    "@servername.database.windows.net:1433/dbname"
    "?driver=ODBC+Driver+18+for+SQL+Server"
    "&Encrypt=yes&TrustServerCertificate=no"
)
Tester la Connexion
scripts/test_connection.py
import pyodbc
from app.config import settings

try:
    # Lister les drivers disponibles
    print("Drivers ODBC disponibles:")
    print(pyodbc.drivers())
    
    # Construire la chaîne de connexion
    conn_str = (
        f"DRIVER={{{settings.SQL_SERVER_DRIVER}}};"
        f"SERVER={settings.SQL_SERVER_HOST},{settings.SQL_SERVER_PORT};"
        f"DATABASE={settings.SQL_SERVER_DB};"
        f"UID={settings.SQL_SERVER_USER};"
        f"PWD={settings.SQL_SERVER_PASSWORD};"
        f"TrustServerCertificate=yes;"
    )
    
    # Tester la connexion
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    row = cursor.fetchone()
    print("\n✅ Connexion réussie!")
    print(f"Version SQL Server: {row[0][:50]}...")
    conn.close()
    
except Exception as e:
    print(f"\n❌ Erreur de connexion: {e}")
Lancer le test:
python scripts/test_connection.py
3.1 Configuration de la Base de Données
app/config.py
from pydantic_settings import BaseSettings
import urllib.parse

class Settings(BaseSettings):
    # SQL Server - Développement (SQLite pour débuter)
    DATABASE_URL: str = "sqlite:///./test.db"
    
    # SQL Server - Production
    # Format: mssql+pyodbc://username:password@server:port/database?driver=ODBC+Driver+18+for+SQL+Server
    SQL_SERVER_HOST: str = "localhost"
    SQL_SERVER_PORT: int = 1433
    SQL_SERVER_USER: str = "sa"
    SQL_SERVER_PASSWORD: str = "YourStrong@Password"
    SQL_SERVER_DB: str = "fastapi_db"
    SQL_SERVER_DRIVER: str = "ODBC Driver 18 for SQL Server"
    
    SECRET_KEY: str = "votre-clé-secrète-très-longue-et-aléatoire"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
    
    def get_sqlserver_url(self) -> str:
        """Construire l'URL de connexion SQL Server"""
        password = urllib.parse.quote_plus(self.SQL_SERVER_PASSWORD)
        driver = urllib.parse.quote_plus(self.SQL_SERVER_DRIVER)
        
        return (
            f"mssql+pyodbc://{self.SQL_SERVER_USER}:{password}"
            f"@{self.SQL_SERVER_HOST}:{self.SQL_SERVER_PORT}"
            f"/{self.SQL_SERVER_DB}?driver={driver}"
            f"&TrustServerCertificate=yes"
        )

settings = Settings()
Créer le fichier .env:
# Développement (SQLite)
DATABASE_URL=sqlite:///./test.db

# Production (SQL Server)
# DATABASE_URL=mssql+pyodbc://...  # Ou utilisez get_sqlserver_url()
SQL_SERVER_HOST=localhost
SQL_SERVER_PORT=1433
SQL_SERVER_USER=sa
SQL_SERVER_PASSWORD=YourStrong@Password123
SQL_SERVER_DB=fastapi_db
SQL_SERVER_DRIVER=ODBC Driver 18 for SQL Server

# Sécurité
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
app/database.py
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Choisir l'URL de base de données selon l'environnement
# Pour développement: utilisez SQLite
# Pour production: utilisez SQL Server
USE_SQLSERVER = False  # Mettre True pour SQL Server

if USE_SQLSERVER:
    DATABASE_URL = settings.get_sqlserver_url()
    connect_args = {
        "timeout": 30,
    }
else:
    DATABASE_URL = settings.DATABASE_URL
    connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# Créer le moteur de base de données
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Vérifier la connexion avant utilisation
    pool_recycle=3600,   # Recycler les connexions après 1h
    echo=False  # Mettre True pour voir les requêtes SQL
)

# Configuration spéciale pour SQL Server (support des IDENTITY columns)
if "mssql" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_identity_insert(dbapi_conn, connection_record):
        """Permettre l'insertion dans les colonnes IDENTITY si nécessaire"""
        pass

# Créer une session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles
Base = declarative_base()

# Dépendance pour obtenir la session DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
3.2 Créer les Modèles SQLAlchemy
app/models/user.py
from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    # Pour SQL Server, utilisez Identity pour l'auto-incrémentation
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # SQL Server: String nécessite une longueur maximale
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # SQL Server supporte DateTime avec timezone
    created_at = Column(DateTime, server_default=func.getdate(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.getdate())
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"
3.3 Schémas Pydantic (Validation des Données)
app/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Schéma de base
class UserBase(BaseModel):
    email: EmailStr
    username: str

# Schéma pour la création
class UserCreate(UserBase):
    password: str

# Schéma pour la mise à jour
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None

# Schéma pour la réponse
class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Permet de convertir les modèles SQLAlchemy
3.4 Créer les Tables
app/main.py (ajouter au début)
from app.database import engine
from app.models import user  # Importer tous les modèles

# Créer toutes les tables
user.Base.metadata.create_all(bind=engine)
________________________________________
Partie 4: Authentification et Sécurité
4.1 Utilitaires de Sécurité
app/utils/security.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# Contexte pour le hachage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hacher un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Créer un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[str]:
    """Décoder un token JWT"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        return username
    except JWTError:
        return None
4.2 Dépendances d'Authentification
app/utils/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.utils.security import decode_access_token

# Schéma OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Obtenir l'utilisateur actuel à partir du token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les identifiants",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    username = decode_access_token(token)
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Vérifier que l'utilisateur est actif"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Utilisateur inactif")
    return current_user
4.3 Routes d'Authentification
app/schemas/auth.py
from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None
app/routers/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserCreate, User as UserSchema
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentification"])

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Créer un nouveau compte utilisateur"""
    # Vérifier si l'email existe déjà
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email déjà enregistré"
        )
    
    # Vérifier si le username existe déjà
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom d'utilisateur déjà pris"
        )
    
    # Créer l'utilisateur
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Se connecter et obtenir un token"""
    # Trouver l'utilisateur
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Vérifier les identifiants
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Créer le token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
4.4 Routes Protégées
app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.utils.dependencies import get_current_active_user

router = APIRouter(prefix="/users", tags=["Utilisateurs"])

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Obtenir les informations de l'utilisateur connecté"""
    return current_user

@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Obtenir la liste des utilisateurs (protégé)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users
4.5 Intégrer les Routers
app/main.py (mise à jour)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import user
from app.routers import auth, users

# Créer les tables
user.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mon API Sécurisée",
    description="API FastAPI avec authentification",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routers
app.include_router(auth.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"message": "API démarrée avec succès!"}
________________________________________
Partie 5: Tests et Validation
5.1 Installation des Outils de Test
pip install pytest httpx pytest-asyncio
tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Base de données de test en mémoire
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture()
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def client(test_db):
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
tests/test_auth.py
def test_register_user(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpass123"
        }
    )
    assert response.status_code == 201
    assert response.json()["email"] == "test@example.com"

def test_login_user(client):
    # D'abord créer un utilisateur
    client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "testpass123"
        }
    )
    
    # Ensuite se connecter
    response = client.post(
        "/auth/login",
        data={
            "username": "testuser",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
Lancer les tests:
pytest
________________________________________
Partie 6: Déploiement avec Docker
6.1 Fichier Dockerfile
Dockerfile
# Image de base Python
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY ./app ./app

# Exposer le port
EXPOSE 8000

# Commande pour démarrer l'application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
6.2 Docker Compose
docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    container_name: fastapi_app
    ports:
      - "8000:8000"
    environment:
      - SQL_SERVER_HOST=sqlserver
      - SQL_SERVER_PORT=1433
      - SQL_SERVER_USER=sa
      - SQL_SERVER_PASSWORD=YourStrong@Passw0rd
      - SQL_SERVER_DB=fastapi_db
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      sqlserver:
        condition: service_healthy
    volumes:
      - ./app:/app/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: sqlserver_db
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourStrong@Passw0rd
      - MSSQL_PID=Developer
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "SELECT 1" || exit 1
      interval: 10s
      timeout: 3s
      retries: 10
      start_period: 10s

volumes:
  sqlserver_data:
requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pyodbc==5.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic[email]==2.5.3
pydantic-settings==2.1.0
alembic==1.13.1
6.3 Commandes Docker
# Construire et démarrer les conteneurs
docker-compose up --build

# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les conteneurs
docker-compose down

# Arrêter et supprimer les volumes (données)
docker-compose down -v
________________________________________
Partie 7: Déploiement Cloud
7.1 Préparation pour la Production
app/config.py (mise à jour pour la production)
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Base de données
    DATABASE_URL: str
    
    # Sécurité
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["https://votre-frontend.com"]
    
    # Environnement
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()
7.2 Déploiement sur Render.com (Gratuit)
render.yaml
services:
  - type: web
    name: fastapi-app
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: postgres-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: ENVIRONMENT
        value: production

databases:
  - name: postgres-db
    plan: free
    databaseName: fastapi_db
Étapes:
1.	Créer un compte sur render.com
2.	Connecter votre repo GitHub
3.	Créer un nouveau "Web Service"
4.	Choisir "Docker"
5.	Configurer les variables d'environnement
6.	Déployer!
7.3 Déploiement sur Railway (Alternative)
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Initialiser le projet
railway init

# Déployer
railway up
7.4 Déploiement sur AWS (Production Avancée)
Via AWS Elastic Beanstalk:
1.	Installer EB CLI:
pip install awsebcli
2.	Initialiser:
eb init -p docker fastapi-app
3.	Créer l'environnement:
eb create fastapi-env
4.	Déployer:
eb deploy
________________________________________
Partie 8: Bonnes Pratiques Production
8.1 Variables d'Environnement Sécurisées
Ne JAMAIS commiter .env dans Git!
.gitignore
# Environnement
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
venv/
*.so

# Base de données
*.db
*.sqlite

# IDE
.vscode/
.idea/

# Docker
.docker/
8.2 Logging
app/utils/logger.py
import logging
from app.config import settings

logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)
Utilisation:
from app.utils.logger import logger

logger.info("Utilisateur connecté")
logger.error("Erreur de connexion à la base de données")
8.3 Gestion des Erreurs
app/utils/exceptions.py
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur"}
    )

# Dans main.py
from app.utils.exceptions import global_exception_handler
app.add_exception_handler(Exception, global_exception_handler)
8.4 Rate Limiting
pip install slowapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/limited")
@limiter.limit("5/minute")
async def limited_endpoint(request: Request):
    return {"message": "Limité à 5 requêtes par minute"}
8.5 Migrations de Base de Données (Alembic)
pip install alembic
alembic init alembic
alembic/env.py (configurer pour SQL Server):
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.database import Base
from app.models import user  # Importer tous les modèles
from app.config import settings

# Configuration Alembic
config = context.config

# Configurer l'URL de connexion
config.set_main_option("sqlalchemy.url", settings.get_sqlserver_url())

# Métadonnées des modèles
target_metadata = Base.metadata

def run_migrations_offline():
    """Migrations en mode 'offline'"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Important pour SQL Server
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Migrations en mode 'online'"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Important pour SQL Server
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
Créer une migration:
# Générer automatiquement la migration
alembic revision --autogenerate -m "Créer table users"

# Appliquer la migration
alembic upgrade head

# Revenir en arrière
alembic downgrade -1

# Voir l'historique
alembic history
Script de création manuelle de la base de données SQL Server:
scripts/create_database.sql
-- Se connecter au serveur SQL Server et exécuter:
USE master;
GO

-- Créer la base de données si elle n'existe pas
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'fastapi_db')
BEGIN
    CREATE DATABASE fastapi_db;
END
GO

-- Utiliser la base de données
USE fastapi_db;
GO

-- La table sera créée par Alembic ou par SQLAlchemy
8.6 Monitoring et Santé
app/routers/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/health", tags=["Santé"])

@router.get("/")
def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

@router.get("/db")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
________________________________________
🎯 Checklist de Production
Avant de déployer en production, vérifiez:
•	[ ] Variables d'environnement configurées
•	[ ] SECRET_KEY forte et unique
•	[ ] CORS configuré avec les bons domaines
•	[ ] Base de données PostgreSQL (pas SQLite)
•	[ ] HTTPS activé (certificat SSL)
•	[ ] Logs configurés
•	[ ] Monitoring en place
•	[ ] Sauvegardes de base de données automatiques
•	[ ] Tests passent tous
•	[ ] Documentation API à jour
•	[ ] Rate limiting activé
•	[ ] Gestion des erreurs globale
•	[ ] .env dans .gitignore
________________________________________
📚 Ressources Supplémentaires
•	Documentation FastAPI: https://fastapi.tiangolo.com/
•	SQLAlchemy: https://docs.sqlalchemy.org/
•	Docker: https://docs.docker.com/
•	PostgreSQL: https://www.postgresql.org/docs/
________________________________________
🚀 Exercices Pratiques
Exercice 1: Créer une API de Blog
•	Modèle Post avec titre, contenu, auteur
•	CRUD complet (Create, Read, Update, Delete)
•	Seul l'auteur peut modifier/supprimer
Exercice 2: Système de Commentaires
•	Ajouter des commentaires aux posts
•	Relations entre tables
•	Pagination des commentaires
Exercice 3: Upload de Fichiers
•	Permettre l'upload d'images
•	Validation de taille et type
•	Stockage dans le cloud (AWS S3)
________________________________________
💡 Conseils pour Débutants
1.	Commencez petit: Ne faites pas tout d'un coup, avancez étape par étape
2.	Testez souvent: Après chaque modification, testez votre API
3.	Lisez les erreurs: Les messages d'erreur vous disent quoi corriger
4.	Utilisez la doc interactive: /docs est votre meilleur ami
5.	Posez des questions: La communauté FastAPI est très active
6.	Versionnez votre code: Utilisez Git dès le début
7.	Documentez: Écrivez des commentaires pour comprendre plus tard
________________________________________
Bonne chance avec votre apprentissage FastAPI! 🎉



   {/* Badge En ligne (≥sm) */}
            <div
              className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1
              text-[0.7rem] text-slate-300 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
              </span>
              <span>En Ligne</span>
            </div>

 j ai ces information je pence que c est interessenat de les metres dans le dachbord graphe avec filter pour afficher selon la categorie l effectif actuel et recommande en utilisant une librerie react vite puissante pour l affichage ?

