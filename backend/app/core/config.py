import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env from backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = os.getenv(
        "PROJECT_NAME",
        "Core Software Development Engine"
    )

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./sql_app.db"
    )

    # OpenRouter
    OPENROUTER_API_KEY: str = os.getenv(
        "OPENROUTER_API_KEY",
        ""
    )

    OPENROUTER_MODEL: str = os.getenv(
        "OPENROUTER_MODEL",
        "nvidia/nemotron-3-ultra-550b-a55b:free"
    )

    # Workspace
    PROJECTS_ROOT: Path = Path(
        os.getenv(
            "PROJECTS_ROOT",
            "/home/b0nd589/Github/core-engine/projects"
        )
    )

    class Config:
        case_sensitive = True


settings = Settings()

# Ensure project directory exists
settings.PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)