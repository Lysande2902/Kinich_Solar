from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    TELEGRAM_TOKEN: str = ""
    API_URL: str = "http://localhost:8000"
    PANEL_USER: str = "asesor"
    PANEL_PASS: str = "kinich2026"
    DB_PATH: str = "kinich.db"
    # Clave secreta para firmar tokens de sesión del panel (HMAC-SHA256)
    # En producción debe definirse en .env con un valor aleatorio de 32+ bytes
    PANEL_SECRET_KEY: str = "kinich-solar-panel-secret-2026-dev-only"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "Kinich"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
