from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import engine, Base, get_db
from backend.routers import (
    health,
    incidents,
    metrics,
    agents,
    predictions,
    recovery,
    websocket
)

# Create database tables at startup (for hackathon/demo simplicity)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AegisOps API",
    description="Autonomous AI-powered Site Reliability Engineering (SRE) platform backend",
    version="1.0.0"
)

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

@app.get("/api/health-score", tags=["health"])
def get_health_score(db: Session = Depends(get_db)):
    # Phase 1: Return a composite health score placeholder (default to 98/100)
    # This will be dynamically calculated in Phase 2 based on recent metrics
    return {"health_score": 98.0}
