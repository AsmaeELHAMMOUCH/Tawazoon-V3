"""Application-wide configuration loaded from environment variables."""
import os


class Settings:
    DB_DRIVER: str | None = os.getenv("DB_DRIVER")
    DB_SERVER: str | None = os.getenv("DB_SERVER")
    DB_NAME: str | None = os.getenv("DB_NAME")
    DB_USER: str | None = os.getenv("DB_USER")
    DB_PASSWORD: str | None = os.getenv("DB_PASSWORD")


settings = Settings()
