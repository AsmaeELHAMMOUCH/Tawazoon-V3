from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DB_DRIVER: str = "ODBC Driver 17 for SQL Server"
    DB_SERVER: str = "BK-P-09\\ISRAA"
    DB_NAME: str = "simulateur"
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    
    # API
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "Simulateur RH API"
    VERSION: str = "1.0.0"
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"DRIVER={self.DB_DRIVER};"
            f"SERVER={self.DB_SERVER};"
            f"DATABASE={self.DB_NAME};"
            f"Trusted_Connection=yes;" 
            f"TrustServerCertificate=yes;"  # Ajoute cela si tu utilises un certificat auto-signé
    )

    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()