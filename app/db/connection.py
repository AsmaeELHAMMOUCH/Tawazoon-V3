"""Database connection helpers."""
import pyodbc
from typing import Iterator

from app.core.config import settings


class DatabaseConnectionError(Exception):
    """Raised when the application cannot connect to the SQL Server instance."""
    pass


def get_connection() -> pyodbc.Connection:
    missing = [
        key for key in ("DB_DRIVER", "DB_SERVER", "DB_NAME", "DB_USER", "DB_PASSWORD")
        if not getattr(settings, key)
    ]
    if missing:
        raise DatabaseConnectionError(f"Configuration manquante pour: {', '.join(missing)}")

    connection_string = (
        f"DRIVER={settings.DB_DRIVER};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;"
        "Connection Timeout=5;"
    )
    try:
        return pyodbc.connect(connection_string)
    except pyodbc.Error as exc:
        raise DatabaseConnectionError("Impossible de se connecter à la base de données.") from exc
