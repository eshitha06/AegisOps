from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import text 

from backend.db import get_db
from backend.models.incident_analysis import IncidentAnalysis
from backend.services.anomaly_service import anomaly_service
from backend.services.risk_engine import risk_engine
from backend.services.recommendation_engine import recommendation_engine

router = APIRouter(prefix="/api/ai", tags=["AI Operations & Analytics Engine"])

@router.post("/analyze/{service}", status_code=status.HTTP_201_CREATED)
async def analyze_service(service: str, db: Session = Depends(get_db)):
    # Pull latest metric sequence directly from metrics table using raw text sql for absolute stability
    latest_query = text("""
        SELECT cpu_usage, memory_usage, error_rate, latency_ms, request_count 
        FROM metrics WHERE service = :service ORDER BY recorded_at DESC LIMIT 1
    """)
    metric_row = db.execute(latest_query, {"service": service}).fetchone()

    if not metric_row:
        raise HTTPException(status_code=404, detail=f"No metrics telemetry found for service: '{service}'")

    current_metric = {
        "cpu_usage": metric_row, "memory_usage": metric_row, 
        "error_rate": metric_row, "latency_ms": metric_row, "request_count": metric_row
    }

    history_query = text("""
        SELECT cpu_usage, memory_usage, error_rate, latency_ms, request_count 
        FROM metrics WHERE service = :service ORDER BY recorded_at DESC LIMIT 100
    """)
    history_rows = db.execute(history_query, {"service": service}).fetchall()
    historical_metrics = [
        {"cpu_usage": r, "memory_usage": r, "error_rate": r, "latency_ms": r, "request_count": r}
        for r in history_rows
    ]

    is_anomaly, anomaly_score = anomaly_service.analyze_metrics(current_metric, historical_metrics)
    risk_score, risk_level = risk_engine.calculate_risk(current_metric, is_anomaly, anomaly_score)
    root_cause, recommended_action = recommendation_engine.generate_analysis(current_metric, risk_level, is_anomaly)

    analysis_record = IncidentAnalysis(
        service=service, risk_score=risk_score, risk_level=risk_level,
        anomaly_score=anomaly_score, is_anomaly=is_anomaly,
        root_cause=root_cause, recommended_action=recommended_action,
        created_at=datetime.utcnow()
    )
    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record)
    return analysis_record

@router.get("/incidents")
async def get_all_incidents(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(IncidentAnalysis).order_by(IncidentAnalysis.created_at.desc()).limit(limit).all()

@router.get("/incidents/{service}")
async def get_service_incidents(service: str, db: Session = Depends(get_db)):
    return db.query(IncidentAnalysis).filter(IncidentAnalysis.service == service).order_by(IncidentAnalysis.created_at.desc()).all()

@router.get("/dashboard")
async def get_ai_dashboard_summary(db: Session = Depends(get_db)):
    time_window = datetime.utcnow() - timedelta(hours=24)
    subquery = text("""
        SELECT DISTINCT ON (service) service, risk_level, risk_score 
        FROM incident_analysis 
        WHERE created_at >= :time_window 
        ORDER BY service, created_at DESC
    """)
    active_records = db.execute(subquery, {"time_window": time_window}).fetchall()
    
    if not active_records:
        return {"total_services": 0, "critical_incidents": 0, "high_incidents": 0, "average_risk": 0}

    total_services = len(active_records)
    critical_incidents = sum(1 for r in active_records if r == "CRITICAL")
    high_incidents = sum(1 for r in active_records if r == "HIGH")
    average_risk = round(sum(float(r) for r in active_records) / total_services, 2)

    return {
        "total_services": total_services,
        "critical_incidents": critical_incidents,
        "high_incidents": high_incidents,
        "average_risk": average_risk
    }