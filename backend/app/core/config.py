from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SUNLINE API"
    ENV: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://sunline:sunline@localhost:5432/sunline_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "nw2xi8wc"
    CLOUDINARY_API_KEY: str = "931552819359415"
    CLOUDINARY_API_SECRET: str = "BxaOwQ8z2jERKdKS1Ti2SfSv2xg"

    # Email
    SENDER_EMAIL: str = "amal.bouguila@supcom.tn"
    BREVO_API_KEY: str = "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"
    SENDER_NAME: str = "SUNLINE"


    # Sentry
    SENTRY_DSN: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
