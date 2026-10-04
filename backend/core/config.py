from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "College Discovery Platform API"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:3000"
    MEILISEARCH_URL: str = "http://localhost:7700"
    MEILISEARCH_API_KEY: str = ""
    # Where admin-uploaded images are kept. Point this at any disk or mounted
    # volume (a bind mount on an on-prem server, a Docker volume on EC2). Files
    # are served from /api/uploads, and only that relative path is stored.
    UPLOAD_DIR: str = "uploads"

    @property
    def cors_origin_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list({*origins, *dev_origins})

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
