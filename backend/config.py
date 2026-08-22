from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = "your_key_here"
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/aegisops"
    REDIS_URL: str = "redis://redis:6379"
    PROMETHEUS_URL: str = "http://prometheus:9090"
    FAILURE_INJECTOR_URL: str = "http://demo-failure-injector:8002"
    DEMO_API_URL: str = "http://demo-api:8000"
    DEMO_WORKER_URL: str = "http://demo-worker:8001"
    DEMO_REPLAY_URL: str = "http://demo-replay:8003"
    # "real" queries the configured Prometheus server.  "demo" deliberately
    # stops the collector; it never substitutes random measurements.
    TELEMETRY_MODE: str = "real"
    DEMO_MODE: bool = False
    ANOMALY_CONTAMINATION: float = 0.05
    POLL_INTERVAL_SECONDS: int = 5

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
