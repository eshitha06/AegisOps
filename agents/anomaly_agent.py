from backend.services.anomaly_service import anomaly_service
from backend.models.metric import Metric
from backend.db import SessionLocal

def run(metric, db=None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
        
    try:
        # Fetch up to 100 recent historical metrics for this service to train the Isolation Forest
        historical = (
            db.query(Metric)
            .filter(Metric.service == metric.service, Metric.source == "real")
            .order_by(Metric.recorded_at.desc())
            .limit(100)
            .all()
        )
        
        historical_dicts = [
            {
                "cpu_usage": m.cpu_usage,
                "memory_usage": m.memory_usage,
                "error_rate": m.error_rate,
                "latency_ms": m.latency_ms,
                "request_count": m.request_count
            } for m in historical
        ]
        
        current_dict = {
            "cpu_usage": metric.cpu_usage,
            "memory_usage": metric.memory_usage,
            "error_rate": metric.error_rate,
            "latency_ms": metric.latency_ms,
            "request_count": metric.request_count
        }
        
        is_anomaly, anomaly_score = anomaly_service.analyze_metrics(current_dict, historical_dicts)
        return {"is_anomaly": is_anomaly, "anomaly_score": anomaly_score}
    finally:
        if close_db:
            db.close()
