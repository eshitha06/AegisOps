import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.incident import Incident
from backend.models.metric import Metric
from backend.config import settings
from backend.schemas.incident import IncidentCreate, IncidentOut

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _enrich_incident(incident: Incident, db: Session, *, include_payload: bool = True) -> IncidentOut:
    # 1. Fetch latest live metric
    latest_metric = (
        db.query(Metric)
        .filter(Metric.service == incident.service, Metric.source == settings.TELEMETRY_MODE)
        .order_by(Metric.recorded_at.desc())
        .first()
    )

    # 2. Extract snapshot metric at incident creation time
    incident_metric = None
    # The incident list is intentionally lightweight. Full evidence/RCA is
    # requested only for the selected incident, so a large historical payload
    # cannot delay the live incident command route.
    if include_payload and incident.observed_evidence:
        try:
            ev = json.loads(incident.observed_evidence)
            incident_metric = ev.get("incident_metric")
        except Exception:
            pass

    if not incident_metric:
        incident_metric_db = (
            db.query(Metric)
            .filter(
                Metric.service == incident.service,
                Metric.source == settings.TELEMETRY_MODE,
                Metric.recorded_at <= incident.created_at,
            )
            .order_by(Metric.recorded_at.desc())
            .first()
        )
        if incident_metric_db:
            incident_metric = {
                "cpu": incident_metric_db.cpu_usage,
                "memory": incident_metric_db.memory_usage,
                "errors_per_second": incident_metric_db.error_rate,
                "latency_ms": incident_metric_db.latency_ms,
                "recorded_at": incident_metric_db.recorded_at.isoformat(),
            }

    # Normalize CPU percentages
    cur_cpu = (latest_metric.cpu_usage * (100.0 if latest_metric.cpu_usage <= 1.0 else 1.0)) if latest_metric else 0.0
    cur_mem = (latest_metric.memory_usage * (100.0 if latest_metric.memory_usage <= 1.0 else 1.0)) if latest_metric else 0.0
    cur_err = latest_metric.error_rate if latest_metric else 0.0
    cur_lat = latest_metric.latency_ms if latest_metric else 0.0

    inc_cpu = None
    inc_mem = None
    inc_err = None
    inc_lat = None
    if incident_metric:
        raw_inc_cpu = incident_metric.get("cpu", 0.0)
        inc_cpu = raw_inc_cpu * (100.0 if raw_inc_cpu <= 1.0 else 1.0)
        raw_inc_mem = incident_metric.get("memory", 0.0)
        inc_mem = raw_inc_mem * (100.0 if raw_inc_mem <= 1.0 else 1.0)
        inc_err = incident_metric.get("errors_per_second", 0.0)
        inc_lat = incident_metric.get("latency_ms", 0.0)

    # Determine live condition
    is_live_active = cur_cpu > 90.0 or cur_mem > 90.0 or cur_err > 0.05 or cur_lat > 1500.0
    live_cond = "ACTIVE" if (is_live_active and incident.status != "resolved") else "CLEARED"

    # Current service state
    if cur_err > 0.05 or cur_cpu > 90.0:
        svc_state = "DEGRADED"
    elif not latest_metric:
        svc_state = "UNKNOWN"
    else:
        svc_state = "HEALTHY"

    return IncidentOut(
        id=incident.id,
        title=incident.title,
        service=incident.service,
        status=incident.status,
        severity=incident.severity,
        root_cause=incident.root_cause,
        confidence_score=incident.confidence_score,
        recovery_action=incident.recovery_action,
        observed_evidence=incident.observed_evidence if include_payload else None,
        rca_result=incident.rca_result if include_payload else None,
        resolution=incident.resolution if include_payload else None,
        created_at=incident.created_at,
        resolved_at=incident.resolved_at,
        live_condition=live_cond,
        current_service_state=svc_state,
        current_cpu_percent=round(cur_cpu, 1),
        current_memory_percent=round(cur_mem, 1),
        current_error_rate=round(cur_err, 4),
        current_latency_ms=round(cur_lat, 1),
        incident_cpu_percent=round(inc_cpu, 1) if inc_cpu is not None else None,
        incident_memory_percent=round(inc_mem, 1) if inc_mem is not None else None,
        incident_error_rate=round(inc_err, 4) if inc_err is not None else None,
        incident_latency_ms=round(inc_lat, 1) if inc_lat is not None else None,
        last_telemetry_time=latest_metric.recorded_at if latest_metric else incident.created_at,
    )


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status: str | None = Query(None, description="Filter incidents by status"),
    db: Session = Depends(get_db),
):
    query = db.query(Incident).filter(Incident.source == settings.TELEMETRY_MODE)
    if status:
        query = query.filter(Incident.status == status)
    # A compact summary is sufficient for the navigation list. Evidence is
    # loaded on demand by GET /api/incidents/{id} for the selected incident.
    incidents = query.order_by(Incident.created_at.desc()).limit(100).all()
    return [_enrich_incident(inc, db, include_payload=False) for inc in incidents]


@router.get("/{id}", response_model=IncidentOut)
def get_incident(id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _enrich_incident(incident, db)


@router.post("", response_model=IncidentOut)
def create_incident(incident_in: IncidentCreate, db: Session = Depends(get_db)):
    db_incident = Incident(
        title=incident_in.title,
        service=incident_in.service,
        severity=incident_in.severity,
        source=settings.TELEMETRY_MODE,
        status=incident_in.status,
        root_cause=incident_in.root_cause,
        confidence_score=incident_in.confidence_score,
        recovery_action=incident_in.recovery_action,
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    return _enrich_incident(db_incident, db)
