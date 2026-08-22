from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db import get_db
from backend.services.telemetry_collector import telemetry_collector
from backend.services.prometheus_collector import prometheus_collector

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


class TelemetryModeRequest(BaseModel):
    mode: str


class TelemetryModeResponse(BaseModel):
    mode: str
    available_modes: List[str]


@router.get("/mode", response_model=TelemetryModeResponse)
def get_telemetry_mode():
    return TelemetryModeResponse(
        mode=settings.TELEMETRY_MODE,
        available_modes=["real", "demo"]
    )


@router.post("/mode", response_model=TelemetryModeResponse)
def set_telemetry_mode(request: TelemetryModeRequest):
    if request.mode not in ["real", "demo"]:
        raise HTTPException(status_code=400, detail="Mode must be 'real' or 'demo'")
    settings.TELEMETRY_MODE = request.mode
    return TelemetryModeResponse(
        mode=settings.TELEMETRY_MODE,
        available_modes=["real", "demo"]
    )


@router.post("/collect")
async def manual_collect():
    if settings.TELEMETRY_MODE == "demo":
        raise HTTPException(status_code=400, detail="Cannot collect real telemetry in demo mode")
    stored = await telemetry_collector.collect_and_store()
    return {"collected": len(stored), "metrics": stored}


@router.get("/services")
async def list_services():
    return {"services": ["api", "worker"], "source": "demo-env Prometheus"}


@router.get("/health/{service}")
async def get_service_health(service: str):
    health = await prometheus_collector.get_service_health(service)
    return health
