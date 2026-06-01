import asyncio
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

SERVICES = ["api-gateway", "auth-service", "payment-service", "order-service"]

@router.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Generate mock metrics for Phase 1 as defined by the specification
            mock_metrics = []
            for i, service in enumerate(SERVICES):
                mock_metrics.append({
                    "id": i + 1,
                    "service": service,
                    "cpu_usage": round(random.uniform(0.1, 0.4), 2),
                    "memory_usage": round(random.uniform(0.2, 0.5), 2),
                    "error_rate": round(random.uniform(0.0, 0.02), 3),
                    "latency_ms": round(random.uniform(50.0, 150.0), 1),
                    "request_count": random.randint(100, 1000),
                    "is_anomaly": False,
                    "recorded_at": datetime.utcnow().isoformat() + "Z"
                })
            await websocket.send_json(mock_metrics)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
