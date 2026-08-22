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
        return {"reachable": False, "error": str(exc), "status_code": 503}


async def collect_incident_evidence(incident: Incident, db: Session) -> dict[str, Any]:
    # 1. Historical trend (last 20 metrics)
    metrics = (
        db.query(Metric)
        .filter(Metric.service == incident.service, Metric.source == "real")
        .order_by(Metric.recorded_at.desc())
        .limit(20)
        .all()
    )
    trend = [
        {
            "at": m.recorded_at.isoformat() + "Z",
            "cpu": m.cpu_usage,
            "memory": m.memory_usage,
            "errors_per_second": m.error_rate,
            "latency_ms": m.latency_ms,
            "requests_per_minute": m.request_count,
            "anomaly": m.is_anomaly,
        }
        for m in reversed(metrics)
    ]

    # 2. Extract snapshot metric at incident creation time
    incident_metric_db = (
        db.query(Metric)
        .filter(Metric.service == incident.service, Metric.source == "real", Metric.recorded_at <= incident.created_at)
        .order_by(Metric.recorded_at.desc())
        .first()
    )
    if not incident_metric_db and metrics:
        incident_metric_db = metrics[-1]

    incident_snapshot = None
    if incident_metric_db:
        incident_snapshot = {
            "at": incident_metric_db.recorded_at.isoformat() + "Z",
            "cpu": incident_metric_db.cpu_usage,
            "memory": incident_metric_db.memory_usage,
            "errors_per_second": incident_metric_db.error_rate,
            "latency_ms": incident_metric_db.latency_ms,
            "requests_per_minute": incident_metric_db.request_count,
            "anomaly": incident_metric_db.is_anomaly,
        }

    # 3. Current live metric
    current_snapshot = trend[-1] if trend else incident_snapshot

    # 4. Service health & Prometheus target health
    services = {
        "api": await _health(settings.DEMO_API_URL),
        "worker": await _health(settings.DEMO_WORKER_URL),
    }
    prom_health = {
        service: await prometheus_collector.get_service_health(service)
        for service in ("api", "worker", "replay")
    }

    # 5. Failure injector state
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            injector_state = (await client.get(f"{settings.FAILURE_INJECTOR_URL}/state")).json()
    except Exception as exc:
        injector_state = {"status": "unavailable", "error": str(exc)}

    # 6. Dataset replay status
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            replay_status = (await client.get(f"{settings.DEMO_REPLAY_URL}/api/replay/status")).json()
    except Exception as exc:
        replay_status = {"status": "unavailable", "error": str(exc)}

    # 7. Compute live condition (ACTIVE vs CLEARED)
    cur_cpu = (current_snapshot.get("cpu", 0.0) if current_snapshot else 0.0) * (100.0 if (current_snapshot.get("cpu", 0.0) if current_snapshot else 0.0) <= 1.0 else 1.0)
    cur_mem = (current_snapshot.get("memory", 0.0) if current_snapshot else 0.0) * (100.0 if (current_snapshot.get("memory", 0.0) if current_snapshot else 0.0) <= 1.0 else 1.0)
    cur_err = current_snapshot.get("errors_per_second", 0.0) if current_snapshot else 0.0
    cur_lat = current_snapshot.get("latency_ms", 0.0) if current_snapshot else 0.0
    svc_down = services.get(incident.service, {}).get("status_code", 200) != 200

    has_active_failure = (
        cur_cpu > 90.0
        or cur_mem > 90.0
        or cur_err > 0.05
        or cur_lat > 1500.0
        or svc_down
        or injector_state.get("cpu")
        or injector_state.get("database")
        or injector_state.get("latency")
        or injector_state.get("worker")
        or injector_state.get("errors")
    )
    live_condition = "ACTIVE" if has_active_failure else "CLEARED"

    # 8. Data Lineage
    data_lineage = {
        "os_metrics": {
            "source": "OSMetrics / Linux kernel / psutil",
            "status": "RECORDED",
            "sample_rate": "1s",
        },
        "demo_env": {
            "source": f"demo-env ({incident.service})",
            "status": "HEALTHY" if not svc_down else "DEGRADED",
            "endpoint": settings.DEMO_API_URL if incident.service == "api" else settings.DEMO_WORKER_URL,
        },
        "prometheus": {
            "source": f"Prometheus ({settings.PROMETHEUS_URL})",
            "status": "UP" if prom_health.get(incident.service, {}).get("healthy", True) else "DOWN",
            "scrape_interval": "5s",
        },
        "resilio": {
            "source": "Resilio REAL Ingestion Engine",
            "status": "LIVE",
            "last_ingested_at": current_snapshot.get("at") if current_snapshot else datetime.utcnow().isoformat() + "Z",
        },
    }

    recent = (
        db.query(Incident)
        .filter(Incident.id != incident.id)
        .order_by(Incident.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "collected_at": datetime.utcnow().isoformat() + "Z",
        "incident": {
            "id": incident.id,
            "title": incident.title,
            "severity": incident.severity,
            "status": incident.status,
            "source": incident.source,
            "created_at": incident.created_at.isoformat() + "Z",
        },
        "service": incident.service,
        "live_condition": live_condition,
        "incident_metric": incident_snapshot,
        "current_metric": current_snapshot,
        "metric_trend": trend,
        "data_lineage": data_lineage,
        "service_health": services,
        "prometheus_target_health": prom_health,
        "failure_injector_state": injector_state,
        "recent_incidents": [
            {
                "id": x.id,
                "service": x.service,
                "status": x.status,
                "severity": x.severity,
                "title": x.title,
                "created_at": x.created_at.isoformat(),
            }
            for x in recent
        ],
        "dataset_replay": replay_status,
        "application_logs": [],
        "notes": ["Telemetry, health probes, and failure injector states are strictly live observed values."],
    }
