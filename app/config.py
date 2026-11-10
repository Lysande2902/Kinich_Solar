from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    TELEGRAM_TOKEN: str = ""
    API_URL: str = "http://localhost:8000"
    PANEL_USER: str = "asesor"
    PANEL_PASS: str = "kinich2026"
    DB_PATH: str = "kinich.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
