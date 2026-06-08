from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from prometheus_fastapi_instrumentator import Instrumentator

from backend.config import settings
from backend.db import engine, Base, get_db
from backend.routers import (
    health,
    incidents,
    metrics,
    agents,
    predictions,
    recovery,
    websocket,
    ai
)

# Create database tables at startup (for hackathon/demo simplicity)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AegisOps API",
    description="Autonomous AI-powered Site Reliability Engineering (SRE) platform backend",
    version="1.0.0"
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

@app.get("/api/health-score", tags=["health"])
def get_health_score():
    return {"health_score": 98.0}