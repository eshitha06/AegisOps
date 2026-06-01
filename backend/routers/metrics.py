from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models.metric import Metric
from backend.schemas.metric import MetricIn, MetricOut

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

@router.post("/ingest", response_model=MetricOut)
def ingest_metric(metric_in: MetricIn, db: Session = Depends(get_db)):
    db_metric = Metric(
        service=metric_in.service,
        cpu_usage=metric_in.cpu_usage,
        memory_usage=metric_in.memory_usage,
        error_rate=metric_in.error_rate,
        latency_ms=metric_in.latency_ms,
        request_count=metric_in.request_count,
        is_anomaly=False  # Anomaly detection logic is added in Phase 2
    )
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric

@router.get("/{service}", response_model=list[MetricOut])
def get_service_metrics(service: str, db: Session = Depends(get_db)):
    # Returns last 50 metrics for the specified service
    metrics = (
        db.query(Metric)
        .filter(Metric.service == service)
        .order_by(Metric.recorded_at.desc())
        .limit(50)
        .all()
    )
    return metrics
