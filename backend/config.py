from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = "your_key_here"
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/aegisops"
    REDIS_URL: str = "redis://redis:6379"
    PROMETHEUS_URL: str = "http://prometheus:9090"
    DEMO_MODE: bool = False
    ANOMALY_CONTAMINATION: float = 0.05
    POLL_INTERVAL_SECONDS: int = 30

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
