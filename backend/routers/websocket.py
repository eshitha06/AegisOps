import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models.metric import Metric
from backend.config import settings

router = APIRouter(tags=["websocket"])

def latest_metrics(db: Session):
    """Return one latest persisted observation per service, never synthetic data."""
    rows = (db.query(Metric).filter(Metric.source == settings.TELEMETRY_MODE)
            .order_by(Metric.recorded_at.desc()).limit(200).all())
    latest = {}
    for metric in rows:
        latest.setdefault(metric.service, metric)
    return [
        {
            "id": metric.id, "service": metric.service,
            "cpu_usage": metric.cpu_usage, "memory_usage": metric.memory_usage,
            "error_rate": metric.error_rate, "latency_ms": metric.latency_ms,
            "request_count": metric.request_count, "is_anomaly": metric.is_anomaly,
            "recorded_at": metric.recorded_at.isoformat() + "Z",
        }
        for metric in latest.values()
    ]

@router.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            db = SessionLocal()
            try:
                await websocket.send_json(latest_metrics(db))
            finally:
                db.close()
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
