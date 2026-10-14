from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    storage_dir: str = "./storage"
    groq_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
STORAGE_PATH = Path(settings.storage_dir).resolve()
STORAGE_PATH.mkdir(parents=True, exist_ok=True)
