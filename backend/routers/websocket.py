import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models.metric import Metric
from backend.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


def latest_metrics(db: Session):
    """Return one latest persisted observation per service, strictly real telemetry."""
    mode = getattr(settings, "TELEMETRY_MODE", "real")
    rows = (
        db.query(Metric)
        .filter(Metric.source == mode)
        .order_by(Metric.recorded_at.desc())
        .limit(200)
        .all()
    )
    latest = {}
    for metric in rows:
        latest.setdefault(metric.service, metric)
    
    return [
        {
            "id": metric.id,
            "service": metric.service,
            "cpu_usage": metric.cpu_usage,
            "memory_usage": metric.memory_usage,
            "error_rate": metric.error_rate,
            "latency_ms": metric.latency_ms,
            "request_count": metric.request_count,
            "is_anomaly": metric.is_anomaly,
            "recorded_at": metric.recorded_at.isoformat() + "Z",
        }
        for metric in latest.values()
    ]


@router.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket /ws/metrics connected")
    
    # Send immediate initial snapshot
    db = SessionLocal()
    try:
        initial_data = latest_metrics(db)
        await websocket.send_json(initial_data)
    except Exception as e:
        logger.error(f"Error sending initial metrics: {e}")
    finally:
        db.close()

    try:
        while True:
            await asyncio.sleep(2)
            db = SessionLocal()
            try:
                data = latest_metrics(db)
                await websocket.send_json(data)
            except Exception as send_err:
                logger.error(f"Error querying/sending websocket metrics: {send_err}")
                break
            finally:
                db.close()
    except WebSocketDisconnect:
        logger.info("WebSocket /ws/metrics disconnected")
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {e}")
