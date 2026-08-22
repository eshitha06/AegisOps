"""Collect only observed operational evidence from demo-env and Prometheus."""
from __future__ import annotations
from datetime import datetime
from typing import Any
import httpx
from sqlalchemy.orm import Session
from backend.config import settings
from backend.models.incident import Incident
from backend.models.metric import Metric
from backend.services.prometheus_collector import prometheus_collector

async def _health(url: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{url}/health")
        return {"reachable": True, "status_code": response.status_code, "body": response.json()}
    except Exception as exc:
        return {"reachable": False, "error": str(exc)}

async def collect_incident_evidence(incident: Incident, db: Session) -> dict[str, Any]:
    metrics = (db.query(Metric).filter(Metric.service == incident.service)
               .order_by(Metric.recorded_at.desc()).limit(20).all())
    trend = [{"at": m.recorded_at.isoformat(), "cpu": m.cpu_usage, "memory": m.memory_usage,
              "errors_per_second": m.error_rate, "latency_ms": m.latency_ms,
              "requests_per_minute": m.request_count, "anomaly": m.is_anomaly} for m in reversed(metrics)]
    services = {"api": await _health(settings.DEMO_API_URL), "worker": await _health(settings.DEMO_WORKER_URL)}
    prom_health = {service: await prometheus_collector.get_service_health(service) for service in ("api", "worker", "replay")}
    recent = (db.query(Incident).filter(Incident.id != incident.id)
              .order_by(Incident.created_at.desc()).limit(5).all())
    return {"collected_at": datetime.utcnow().isoformat() + "Z", "service": incident.service,
            "current_metric": trend[-1] if trend else None, "metric_trend": trend,
            "service_health": services, "prometheus_target_health": prom_health,
            "recent_incidents": [{"id": x.id, "service": x.service, "status": x.status,
                "severity": x.severity, "title": x.title, "created_at": x.created_at.isoformat()} for x in recent],
            "application_logs": [],
            "notes": ["No application log endpoint is exposed by this demo service; logs are omitted rather than fabricated."]}
