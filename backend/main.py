from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from prometheus_fastapi_instrumentator import Instrumentator

from backend.config import settings
from backend.db import engine, Base, get_db
from backend.models.metric import Metric
from backend.routers import (
    health,
    incidents,
    metrics,
    agents,
    predictions,
    recovery,
    websocket,
    ai
    , telemetry
)

# Create database tables at startup (for hackathon/demo simplicity)
Base.metadata.create_all(bind=engine)

# Lightweight additive migration for the pre-existing hackathon database.
with engine.begin() as connection:
    for statement in (
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS observed_evidence TEXT",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS rca_result TEXT",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolution TEXT",
        "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'demo'",
        "ALTER TABLE metrics ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'demo'",
        "ALTER TABLE recovery_actions ADD COLUMN IF NOT EXISTS execution_log TEXT",
        "ALTER TABLE recovery_actions ADD COLUMN IF NOT EXISTS verification_result TEXT",
    ):
        connection.execute(text(statement))

@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.services.telemetry_collector import telemetry_collector
    await telemetry_collector.start()
    yield
    await telemetry_collector.stop()
    await telemetry_collector.close()


app = FastAPI(
    title="Resilio API",
    description="Observability and incident response platform backend",
    version="1.0.0"
    , lifespan=lifespan
)

# Instrument the app for Prometheus metric collection
Instrumentator().instrument(app).expose(app)


# CORS configuration to allow all origins during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(health.router)
app.include_router(metrics.router)
app.include_router(incidents.router)
app.include_router(agents.router)
app.include_router(predictions.router)
app.include_router(recovery.router)
app.include_router(websocket.router)
app.include_router(ai.router)
app.include_router(telemetry.router)

@app.get("/api/health-score", tags=["health"])
def get_health_score(db: Session = Depends(get_db)):
    """A current score derived from persisted collector observations."""
    recent = db.query(Metric).order_by(Metric.recorded_at.desc()).limit(50).all()
    if not recent:
        return {"health_score": 0.0}
    cpu = sum(m.cpu_usage for m in recent) / len(recent)
    errors = sum(m.error_rate for m in recent) / len(recent)
    latency = sum(m.latency_ms for m in recent) / len(recent)
    penalty = cpu * 35 + min(errors / 0.05, 1) * 35 + min(latency / 1500, 1) * 30
    return {"health_score": round(max(0.0, 100.0 - penalty), 1)}
